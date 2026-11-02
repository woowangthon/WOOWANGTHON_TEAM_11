// Round-trip experiment (#6): how many fix requests does it take until the post-check finds no
// violations, with and without the spec? Every call is real; transcripts are saved.
//
//   node --experimental-strip-types --no-warnings scripts/experiment-rounds.ts
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import {
  ALL_RULES,
  GEMINI_OPENAI_BASE,
  buildFixPrompt,
  buildSpec,
  deriveProfile,
  estimateTokens,
  generateCards,
  generateTasks,
  recommendRules,
  recommendedAnswers,
  reviewCode,
  toDecisions,
  toDomainRules,
} from '../packages/core/src/index.ts';
import type { LlmConfig, Rule } from '../packages/core/src/index.ts';

const env = Object.fromEntries(
  readFileSync('.env', 'utf8')
    .split('\n')
    .map((l) => l.match(/^([A-Z_]+)=(.*)$/))
    .filter((m): m is RegExpMatchArray => m !== null)
    .map((m) => [m[1], m[2].trim()]),
);
const key = env.GEMINI_API_KEY;
if (!key) throw new Error('GEMINI_API_KEY missing from .env');

const prep: LlmConfig = { baseUrl: GEMINI_OPENAI_BASE, apiKey: key, models: ['gemini-flash-lite-latest', 'gemini-flash-latest'] };
// CODER=agent: the coding side is a fresh Claude subagent (what people actually code with), driven
// by hand. The script stops with exit 10 and writes pending.json whenever it needs an answer; the
// answer goes in the file it names and the script is run again. Reviews are cached per round so a
// rerun does not re-ask the reviewer and get a different verdict.
const AGENT = process.env.CODER === 'agent';
const CODER_MODEL = AGENT ? 'Claude 서브에이전트 (새 대화, 이 프로젝트 맥락 없음)' : 'gemini-flash-lite-latest';
const MAX_FIX_ROUNDS = 3;
const OUT = AGENT ? 'docs/experiment/rounds-agent' : 'docs/experiment/rounds';

const REQUESTS = [
  '동아리 회비 관리 앱. 회원별 납부 여부를 보고 미납자에게 알림을 보내고 싶어',
  '스터디 모임 출석체크랑 벌금 정산해주는 웹사이트',
];

const CODER_SYSTEM = `You are an AI coding agent. Build what is asked.
Output the complete source code, each file starting with a line "=== path/to/file ===". Keep the whole answer under about 500 lines.
When asked to fix something, output the complete updated source in the same format.`;

type Msg = { role: 'system' | 'user' | 'assistant'; content: string };

async function chat(messages: Msg[], answerFile: string): Promise<string> {
  if (AGENT) {
    if (existsSync(answerFile)) return readFileSync(answerFile, 'utf8');
    writeFileSync(`${OUT}/pending.json`, JSON.stringify({ answerFile, messages }, null, 2));
    console.log(`PENDING ${answerFile}`);
    process.exit(10);
  }
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(`${GEMINI_OPENAI_BASE}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model: CODER_MODEL, messages, temperature: 0.2, reasoning_effort: 'low', max_tokens: 8192 }),
        signal: AbortSignal.timeout(420_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = (await res.json()) as { choices: { message: { content: string } }[] };
      return body.choices[0].message.content;
    } catch (err) {
      // "fetch failed" is undici's header timeout on long generations; worth one more try like a 5xx.
      // Flash answers "high demand" with 503 or 429 for stretches of 10+ minutes, so wait it out.
      if (attempt >= 10 || !/HTTP (429|5\d\d)|timeout|fetch failed/i.test((err as Error).message)) throw err;
      console.log(`  retry ${attempt}: ${(err as Error).message.slice(0, 50)}`);
      await new Promise((r) => setTimeout(r, 60_000 * Math.min(attempt, 5)));
    }
  }
}

interface Run {
  fixRounds: number;
  cleared: boolean;
  tokens: number;
  violationsPerRound: number[];
}

async function runCondition(label: string, firstPrompt: string, rules: Rule[], file: string): Promise<Run> {
  if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8')).run as Run;
  const messages: Msg[] = [
    { role: 'system', content: CODER_SYSTEM },
    { role: 'user', content: firstPrompt },
  ];
  const violationsPerRound: number[] = [];
  let fixRounds = 0;
  for (;;) {
    const base = file.replace(/\.json$/, `-r${fixRounds}`);
    const code = await chat(messages, `${base}.txt`);
    messages.push({ role: 'assistant', content: code });
    const reviewFile = `${base}-review.json`;
    const review: Awaited<ReturnType<typeof reviewCode>> = existsSync(reviewFile)
      ? JSON.parse(readFileSync(reviewFile, 'utf8'))
      : await reviewCode(prep, code, rules);
    // The rubric must come from the AI path in both conditions, or the comparison is not like for like.
    if (review.source !== 'ai') throw new Error(`review fell back (${label}): ${review.error}`);
    if (AGENT) writeFileSync(reviewFile, JSON.stringify(review, null, 2));
    const violations = review.findings.filter((f) => f.verdict === 'violation');
    violationsPerRound.push(violations.length);
    console.log(`  ${label} round ${fixRounds}: ${violations.length} violations`);
    if (violations.length === 0 || fixRounds === MAX_FIX_ROUNDS) break;
    messages.push({ role: 'user', content: buildFixPrompt(violations, rules) });
    fixRounds++;
  }
  // Tokens a real agent would pay: every message it reads (the whole history each turn) plus what it writes.
  let tokens = 0;
  for (let i = 0; i < messages.length; i++) {
    if (messages[i].role === 'assistant') {
      tokens += messages.slice(0, i).reduce((n, m) => n + estimateTokens(m.content), 0);
      tokens += estimateTokens(messages[i].content);
    }
  }
  const run: Run = { fixRounds, cleared: violationsPerRound.at(-1) === 0, tokens, violationsPerRound };
  writeFileSync(file, JSON.stringify({ run, messages }, null, 2));
  return run;
}

mkdirSync(OUT, { recursive: true });
const rows: string[] = [];

for (const [i, request] of REQUESTS.entries()) {
  const specFile = `${OUT}/${i + 1}-spec.json`;
  let setup: { spec: string; ruleIds: string[] };
  if (existsSync(specFile)) {
    setup = JSON.parse(readFileSync(specFile, 'utf8'));
  } else {
    const cards = await generateCards(prep, request);
    if (cards.source !== 'ai') throw new Error(`cards fell back: ${cards.error}`);
    const answers = recommendedAnswers(cards.data.cards);
    const profile = deriveProfile(cards.data.cards, answers);
    const rules = recommendRules(profile).filter((r) => r.recommended).map((r) => r.rule);
    const decisions = toDecisions(cards.data.cards, answers);
    const tasks = await generateTasks(prep, request, decisions, rules, profile);
    const spec = buildSpec({ request, summary: cards.data.summary, decisions, domainRules: toDomainRules(cards.data.cards, answers), notes: '', rules, ...tasks.data });
    setup = { spec, ruleIds: rules.map((r) => r.id) };
    writeFileSync(specFile, JSON.stringify(setup, null, 2));
  }
  const rules = ALL_RULES.filter((r) => setup.ruleIds.includes(r.id));

  console.log(`request ${i + 1}`);
  const plain = await runCondition('plain', request, rules, `${OUT}/${i + 1}-plain.json`);
  const withSpec = await runCondition('spec', setup.spec, rules, `${OUT}/${i + 1}-with-spec.json`);
  for (const [label, r] of [['사양서 없음', plain], ['사양서 있음', withSpec]] as const) {
    rows.push(
      `| ${i + 1} | ${label} | ${r.violationsPerRound.join(' → ')} | ${r.fixRounds} | ${r.cleared ? 'O' : `- (${MAX_FIX_ROUNDS}회 후에도 남음)`} | ≈${r.tokens.toLocaleString()} |`,
    );
  }
}

const report = `# 왕복 횟수 실험 (#6)

- 실행일: ${new Date().toISOString().slice(0, 10)}
- 코딩 역할 모델: ${CODER_MODEL} / 점검 모델: 서비스와 동일 (gemini-flash-lite-latest)
- 절차: 코드 생성 → 사후 점검 → 위반이 있으면 수정 요청문(서비스 6단계와 동일)으로 다시 요청, 최대 ${MAX_FIX_ROUNDS}회
- 점검 기준 규칙은 양쪽 조건 동일 (서비스가 그 요청에 추천한 규칙)
- 원본 대화: 같은 폴더의 \`N-plain.json\`, \`N-with-spec.json\` (회차별 원본은 \`N-조건-rK.*\`) · 해석: INTERPRETATION.md · 서브에이전트 실측 토큰: usage.jsonl

| 요청 | 조건 | 회차별 위반 수 | 수정 요청 횟수 | 위반 0 도달 | 총 토큰(추정) |
|---|---|---|---|---|---|
${rows.join('\n')}

## 한계
- 총 토큰은 실제 에이전트처럼 매 회차 전체 대화를 다시 읽는다고 보고 추정 (packages/core/src/tokens.ts, 양쪽 같은 방식)
- 위반 판정 일부는 AI 판단이라 회차마다 흔들릴 수 있음
- 요청 ${REQUESTS.length}건, 조건당 1회 실행. 경향 확인용
`;
writeFileSync(`${OUT}/README.md`, report);
console.log(report);
