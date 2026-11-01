// With-spec vs without-spec comparison. Every number in the report comes from a real model
// call made by this script; raw outputs are saved next to the report so they can be checked.
//
//   node --experimental-strip-types --no-warnings scripts/experiment.ts
//
// The "coding AI" here is a free Gemini model standing in for a real coding agent. That is a
// limitation, stated in the report: real agents iterate, this measures the first attempt only.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import {
  GEMINI_OPENAI_BASE,
  buildSpec,
  deriveProfile,
  estimateTokens,
  generateCards,
  generateTasks,
  recommendRules,
  recommendedAnswers,
  toDecisions,
} from '../packages/core/src/index.ts';
import type { LlmConfig } from '../packages/core/src/index.ts';

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
const CODER_MODEL = 'gemini-flash-latest';

const REQUESTS = [
  '동아리 회비 관리 앱. 회원별 납부 여부를 보고 미납자에게 알림을 보내고 싶어',
  '스터디 모임 출석체크랑 벌금 정산해주는 웹사이트',
  '중고 교재 거래 게시판. 사진 올리고 채팅으로 거래',
];

const CODER_SYSTEM = `You are an AI coding agent. Build the first working version of the app described.
First, list every decision you had to make yourself because the instructions did not specify it, one per line, each starting with "ASSUMPTION:".
Then output the complete source code, each file starting with a line "=== path/to/file ===". Keep the whole answer under about 500 lines.`;

// Free-tier models return 503 under load; a short wait usually clears it.
async function code(prompt: string): Promise<{ text: string }> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await codeOnce(prompt);
    } catch (err) {
      if (attempt >= 4 || !/HTTP (429|5\d\d)|timeout/i.test((err as Error).message)) throw err;
      console.log(`retrying after: ${(err as Error).message.slice(0, 60)}`);
      await new Promise((r) => setTimeout(r, 20_000 * attempt));
    }
  }
}

async function codeOnce(prompt: string): Promise<{ text: string }> {
  const res = await fetch(`${GEMINI_OPENAI_BASE}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: CODER_MODEL,
      messages: [
        { role: 'system', content: CODER_SYSTEM },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      reasoning_effort: 'low',
      // Unbounded output ran past five minutes on the first try; both conditions get the same cap.
      max_tokens: 8192,
    }),
    signal: AbortSignal.timeout(420_000),
  });
  if (!res.ok) throw new Error(`coder call failed: HTTP ${res.status} ${await res.text()}`);
  const body = (await res.json()) as { choices: { message: { content: string } }[] };
  return { text: body.choices[0].message.content };
}

// Static checks on the generated code. Crude on purpose and listed in the report as such.
const CHECKS = {
  hardcodedSecret: (t: string) =>
    /(api[_-]?key|secret|password|token)\s*[:=]\s*['"][A-Za-z0-9_\-]{8,}['"]/i.test(t),
  usesEnv: (t: string) => /process\.env|import\.meta\.env|os\.environ|\.env\b/.test(t),
  hashesPasswords: (t: string) => /bcrypt|argon2|scrypt|pbkdf2/i.test(t),
  validatesInput: (t: string) => /\bzod\b|joi\b|express-validator|validate\(|\.safeParse|typeof [a-z]+ !== ['"]string/i.test(t),
};

const files = (t: string) => (t.match(/^=== .+ ===$/gm) ?? []).length;
const assumptions = (t: string) => (t.match(/^\s*[-*]?\s*ASSUMPTION:/gm) ?? []).length;

const OUT = 'docs/experiment';
mkdirSync(OUT, { recursive: true });
const rows: string[] = [];

for (const [i, request] of REQUESTS.entries()) {
  const saved = [`${OUT}/${i + 1}-spec.md`, `${OUT}/${i + 1}-output-plain.md`, `${OUT}/${i + 1}-output-spec.md`];
  // Each request costs minutes on the free tier; a finished one is not re-run after a later failure.
  // Each artefact is written as soon as it exists, so a failure only re-runs what is missing.
  const read = (f: string) => (existsSync(f) ? readFileSync(f, 'utf8') : null);
  let spec = read(saved[0]);
  if (spec === null) {
    const cards = await generateCards(prep, request);
    if (cards.source !== 'ai') throw new Error(`card generation fell back for request ${i + 1}: ${cards.error}`);
    const answers = recommendedAnswers(cards.data.cards);
    const profile = deriveProfile(cards.data.cards, answers);
    const rules = recommendRules(profile).filter((r) => r.recommended).map((r) => r.rule);
    const decisions = toDecisions(cards.data.cards, answers);
    const tasks = await generateTasks(prep, request, decisions, rules, profile);
    spec = buildSpec({ request, summary: cards.data.summary, decisions, rules, tasks: tasks.data });
    writeFileSync(saved[0], spec);
  }
  let plain = read(saved[1]);
  if (plain === null) {
    plain = (await code(request)).text;
    writeFileSync(saved[1], plain);
  }
  let withSpec = read(saved[2]);
  if (withSpec === null) {
    withSpec = (await code(spec)).text;
    writeFileSync(saved[2], withSpec);
  }
  addRows(i, spec, plain, withSpec);
  console.log(`request ${i + 1} done`);
}

function addRows(i: number, spec: string, plain: string, withSpec: string) {
  for (const [label, text] of [['사양서 없음', plain], ['사양서 있음', withSpec]] as const) {
    const c = Object.fromEntries(Object.entries(CHECKS).map(([k, f]) => [k, f(text)]));
    const mark = (b: boolean) => (b ? 'O' : '-');
    rows.push(
      `| ${i + 1} | ${label} | ${assumptions(text)} | ${files(text)} | ≈${estimateTokens(text)} | ${mark(!c.hardcodedSecret)} | ${mark(c.usesEnv)} | ${mark(c.hashesPasswords)} | ${mark(c.validatesInput)} |`,
    );
  }
  rows.push(`| ${i + 1} | (사양서 크기) | | | ≈${estimateTokens(spec)} 입력 | | | | |`);
}

const report = `# 사양서 유무 비교 실험

- 실행일: ${new Date().toISOString().slice(0, 10)}
- 사전 정리 모델: gemini-flash-lite-latest (서비스와 동일), 코딩 역할 모델: ${CODER_MODEL}
- 사양서는 서비스 흐름 그대로 생성: 카드 생성 → 추천안 그대로 선택 → 추천 규칙 → 작업 계획
- 원본 출력: 같은 폴더의 \`N-output-plain.md\`, \`N-output-spec.md\`, \`N-spec.md\`

| 요청 | 조건 | AI가 임의로 정한 것(개수) | 파일 수 | 출력 토큰(추정) | 키 하드코딩 없음 | 환경변수 사용 | 비밀번호 해시 | 입력 검증 |
|---|---|---|---|---|---|---|---|---|
${rows.join('\n')}

## 지표 설명과 한계
- **출력 토큰(추정)**: 모든 조건에 같은 방식(문자 수 기반 추정, packages/core/src/tokens.ts)을 적용
- **AI가 임의로 정한 것**: 모델이 직접 "ASSUMPTION:"으로 밝힌 개수. 모델의 자기 보고라 실제 추측 수와 다를 수 있음
- 보안 4항목은 정규식 기반의 거친 정적 검사. 오탐·미탐 가능
- 실제 코딩 에이전트는 여러 번 고치며 진행하지만 이 실험은 **첫 시도 1회**만 측정
- 요청당 1회 실행이라 통계적 유의성은 없음. 경향 확인용
`;
writeFileSync(`${OUT}/README.md`, report);
console.log(report);
