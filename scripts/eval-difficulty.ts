// Does the project-size verdict match what an experienced engineer would say? Each request has the
// tier a senior engineer would give it; the real cards call is made and both the AI's own verdict
// and the verdict after the rule floor are recorded, so it is visible how much the rule carries.
//
//   node --experimental-strip-types --no-warnings scripts/eval-difficulty.ts
//   REPEAT=3 SET=extended OUT=docs/experiment/difficulty-repeat node ... (20 requests, each run 3 times)
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { GEMINI_OPENAI_BASE, chatJson, extractJson, generateCards, parseFeasibility } from '../packages/core/src/index.ts';
import { CARDS_SYSTEM, cardsUser } from '../packages/core/src/prompts.ts';
import type { LlmConfig, Tier } from '../packages/core/src/index.ts';

const env = Object.fromEntries(
  readFileSync('.env', 'utf8')
    .split('\n')
    .map((l) => l.match(/^([A-Z_]+)=(.*)$/))
    .filter((m): m is RegExpMatchArray => m !== null)
    .map((m) => [m[1], m[2].trim()]),
);
const llm: LlmConfig = { baseUrl: GEMINI_OPENAI_BASE, apiKey: env.GEMINI_API_KEY, models: ['gemini-flash-lite-latest', 'gemini-flash-latest'] };
const OUT = process.env.OUT ?? 'docs/experiment/difficulty';
const REPEAT = Number(process.env.REPEAT ?? 1);

// Expected tiers are a senior engineer's call for one non-developer building it with an AI agent.
const CASES: { request: string; expected: Tier }[] = [
  { request: '비트코인 사고팔 수 있는 거래소 웹사이트', expected: 'enterprise' },
  { request: '원격 진료 예약하고 의사가 처방전 보내주는 앱', expected: 'enterprise' },
  { request: '중고 PC 부품 사고파는 마켓, 안전결제 포함', expected: 'team' },
  { request: '친구들이랑 하는 실시간 멀티 대전 웹게임', expected: 'team' },
  { request: '동아리 출석체크 앱', expected: 'personal' },
  { request: '혼자 쓰는 가계부', expected: 'personal' },
  { request: '깃허브 이슈 들어오면 라벨 추천해주는 내 오픈소스용 봇', expected: 'personal' },
  // The owner's own test (#25): the same tool, judged differently once the goal differs.
  { request: '오픈소스 mv 만들기용 애니메이션 제작 툴. 개인용 테스트 가능하며 상업용 판매 예정', expected: 'team' },
  { request: '오픈소스 mv 만들기용 애니메이션 제작 툴. 개인 사용 및 오픈소스로 누구나 수정가능하게 하는 수준', expected: 'personal' },
  // #36: detection with "accurate probabilities" is an open research problem.
  { request: 'AI가 그린 그림인지 사람이 그린 그림인지 판별하는 프로그램', expected: 'enterprise' },
];
// Added 11/14 to widen the check. Expected tiers were written down before the run.
const EXTENDED: { request: string; expected: Tier }[] = [
  { request: '내 포트폴리오 소개 웹사이트', expected: 'personal' },
  { request: '혼자 쓰는 레시피 기록 앱', expected: 'personal' },
  { request: '학과 공지사항을 모아서 나한테 알려주는 텔레그램 봇', expected: 'personal' },
  { request: '회의 녹음을 올리면 요약해 주는 내 개인용 도구 (외부 음성인식 API 사용)', expected: 'personal' },
  { request: '우리 카페 테이블 QR로 메뉴 주문하고 카드 결제까지', expected: 'team' },
  { request: '수제 액세서리 파는 작은 쇼핑몰, 결제와 배송 조회 포함', expected: 'team' },
  { request: '동네 사람들끼리 쓰는 실시간 단체 채팅 앱', expected: 'team' },
  { request: '주식 자동매매 프로그램, 내 증권 계좌로 실제 주문', expected: 'enterprise' },
  { request: '병원에서 쓰는 환자 진료 기록 관리 시스템', expected: 'enterprise' },
  { request: '가게·라이더·고객을 연결하는 음식 배달 앱', expected: 'enterprise' },
];
const SET = process.env.SET === 'extended' ? [...CASES, ...EXTENDED] : CASES;

mkdirSync(OUT, { recursive: true });
const rows: string[] = [];
const raw: unknown[] = [];
let aiHit = 0;
let finalHit = 0;
let runs = 0;
const perCase = new Map<string, { expected: Tier; finals: (Tier | null)[]; owns: (Tier | null)[] }>();
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
for (let rep = 0; rep < REPEAT; rep++) for (const c of SET) {
  runs++;
  await pause(Number(process.env.PAUSE_MS ?? 0));
  // The AI's own answer, before the floor, so the rule's share is measurable.
  const res = await chatJson(llm, CARDS_SYSTEM, cardsUser(c.request)).catch((e: Error) => ({ text: '', model: null, error: e.message }));
  let own = null;
  try {
    own = res.text ? parseFeasibility((extractJson(res.text) as Record<string, unknown>).feasibility) : null;
  } catch {
    // Broken JSON counts as "no verdict" from the AI, the same way the service treats it.
  }
  const final = (await generateCards(llm, c.request)).data.feasibility;
  if (own?.tier === c.expected) aiHit++;
  if (final?.tier === c.expected) finalHit++;
  const pc = perCase.get(c.request) ?? { expected: c.expected, finals: [], owns: [] };
  pc.finals.push(final?.tier ?? null);
  pc.owns.push(own?.tier ?? null);
  perCase.set(c.request, pc);
  raw.push({ ...c, rep, own, final });
  console.log(`${c.request} → AI ${own?.tier ?? '-'} / final ${final?.tier ?? '-'} (expected ${c.expected})`);
  if (REPEAT === 1) rows.push(
    `| ${c.request} | ${c.expected} | ${own?.tier ?? '(실패)'} | ${final?.tier ?? '-'}${final?.raisedBy ? ' (규칙으로 올림)' : ''} | ${final?.goal ?? '-'} | ${(final?.why ?? '').replace(/\|/g, '/')} |`,
  );
}

writeFileSync(`${OUT}/results.json`, JSON.stringify(raw, null, 2));
if (REPEAT > 1) {
  const label = (t: Tier | null) => t ?? '실패';
  let stable = 0;
  let allHit = 0;
  const lines = [...perCase.entries()].map(([request, pc]) => {
    const same = pc.finals.every((t) => t === pc.finals[0]);
    const hits = pc.finals.filter((t) => t === pc.expected).length;
    if (same) stable++;
    if (hits === pc.finals.length) allHit++;
    return `| ${request} | ${pc.expected} | ${pc.owns.map(label).join(' · ')} | ${pc.finals.map(label).join(' · ')} | ${hits}/${pc.finals.length} |`;
  });
  writeFileSync(
    `${OUT}/README.md`,
    `# 프로젝트 규모 판정 반복 점검

- 실행일: ${new Date().toISOString().slice(0, 10)} · 모델: 서비스와 동일 (gemini-flash-lite-latest, 실패 시 gemini-flash-latest)
- 요청 ${perCase.size}개 × ${REPEAT}회 = ${runs}회 실행. 앞 10개는 11/4 점검과 같은 요청, 뒤 10개는 11/14 추가 (기대값은 실행 전에 적음)
- 기대값은 "비개발자 1명이 AI 코딩 도구로 만든다"는 전제의 판단 (Claude가 작성, 정답이 아님)
- AI 단독 = 규칙 적용 전, 최종 = 화면에 나가는 판정 (규칙 바닥 적용 후)

## 결과
- 최종 판정 일치: ${finalHit}/${runs}회 (${Math.round((finalHit / runs) * 100)}%) · AI 단독 일치: ${aiHit}/${runs}회 (${Math.round((aiHit / runs) * 100)}%)
- ${REPEAT}회 모두 같은 최종 판정이 나온 요청: ${stable}/${perCase.size}개
- ${REPEAT}회 모두 기대와 일치한 요청: ${allHit}/${perCase.size}개

| 요청 | 기대 | AI 단독 (회차별) | 최종 (회차별) | 최종 일치 |
|---|---|---|---|---|
${lines.join('\n')}

## 한계
- 기대값이 판단이라 정답이 아님. 위험 분야(암호화폐·금융·의료 등)는 규칙 바닥이 있어 최종 일치가 규칙 덕분일 수 있음 → AI 단독 열과 같이 볼 것
- 원본: results.json
`,
  );
  console.log(`final ${finalHit}/${runs}, ai ${aiHit}/${runs}, stable ${stable}/${perCase.size}`);
} else {
writeFileSync(
  `${OUT}/README.md`,
  `# 프로젝트 규모 판정 점검

- 실행일: ${new Date().toISOString().slice(0, 10)} · 모델: 서비스와 동일 (gemini-flash-lite-latest)
- 기대값은 "비개발자 1명이 AI 코딩 도구로 만든다"는 전제에서 경험 있는 개발자가 줄 판정
- AI 단독 = 규칙 적용 전 AI 판정, 최종 = 화면에 나가는 판정 (규칙 바닥 적용 후). 두 번 호출이라 서로 다를 수 있음
- AI 단독 일치 ${aiHit}/${CASES.length}, 최종 일치 ${finalHit}/${CASES.length}

| 요청 | 기대 | AI 단독 | 최종 | 목적 | 화면에 나간 이유 |
|---|---|---|---|---|---|
${rows.join('\n')}

## 한계
- 요청 ${CASES.length}건, 각 1회. 경향 확인용이고 같은 요청도 호출마다 달라질 수 있음
- 기대값 자체가 판단이라 정답이 아님. 최종 확인은 사람이 웹에서 직접 함
- 원본: results.json
`,
);
console.log(`AI ${aiHit}/${CASES.length}, final ${finalHit}/${CASES.length}`);
}
