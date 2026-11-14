// Does the service do what it is for? Three things are measured on real calls:
//  1. requirements it adds: decisions and features the one-line request never mentioned
//  2. "looks easy, is hard": AI services that need their own trained model or data
//  3. the opposite control: AI services an existing API covers, which must not be scared off
// Expected labels were written down before the run.
//
//   node --experimental-strip-types --no-warnings scripts/eval-hidden-hard.ts
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { GEMINI_OPENAI_BASE, generateCards } from '../packages/core/src/index.ts';
import type { LlmConfig } from '../packages/core/src/index.ts';

const env = Object.fromEntries(
  readFileSync('.env', 'utf8')
    .split('\n')
    .map((l) => l.match(/^([A-Z_]+)=(.*)$/))
    .filter((m): m is RegExpMatchArray => m !== null)
    .map((m) => [m[1], m[2].trim()]),
);
const llm: LlmConfig = { baseUrl: GEMINI_OPENAI_BASE, apiKey: env.GEMINI_API_KEY, models: ['gemini-flash-lite-latest', 'gemini-flash-latest'] };
const OUT = process.env.OUT ?? 'docs/experiment/hidden-hard';
const REPEAT = Number(process.env.REPEAT ?? 2);

type Kind = 'needs-training' | 'api-enough';
const CASES: { request: string; kind: Kind; note: string }[] = [
  // Sound like a weekend project; each needs data collection and a model trained for it.
  { request: '내 목소리를 학습해서 내 목소리로 노래를 불러주는 AI 앱', kind: 'needs-training', note: '음성 합성 모델 학습' },
  { request: '한국 수어를 카메라로 인식해서 자막으로 바꿔주는 앱', kind: 'needs-training', note: '수어 영상 데이터와 인식 모델' },
  { request: '우리 반 친구들 얼굴을 알아보고 자동으로 출석 체크하는 프로그램', kind: 'needs-training', note: '얼굴 인식 정확도와 생체정보' },
  { request: '내 그림체를 학습해서 내 그림체로 그림을 그려주는 AI', kind: 'needs-training', note: '이미지 생성 모델 파인튜닝과 GPU' },
  { request: '경상도 사투리를 알아듣는 음성 비서', kind: 'needs-training', note: '사투리 음성 데이터' },
  { request: '피부 사진을 찍으면 피부 질환인지 알려주는 앱', kind: 'needs-training', note: '의료 영상 모델과 오진 책임' },
  { request: '주가를 예측해서 내일 오를 종목을 알려주는 AI', kind: 'needs-training', note: '예측 모델, 맞는다는 보장 불가' },
  { request: '농구 경기 영상을 올리면 선수별 슛 성공률을 자동으로 분석해주는 서비스', kind: 'needs-training', note: '영상 객체 추적 모델' },
  // Sound like "AI", but a hosted API does the hard part.
  { request: '자기소개서를 붙여 넣으면 AI가 첨삭해주는 웹사이트 (ChatGPT API 사용)', kind: 'api-enough', note: 'LLM API 호출' },
  { request: 'PDF를 올리면 요약해주는 내 개인용 도구', kind: 'api-enough', note: 'LLM API 호출' },
  { request: '영어 일기를 쓰면 문법을 고쳐주는 앱', kind: 'api-enough', note: 'LLM API 호출' },
  { request: '사진 속 글자를 읽어서 텍스트로 바꿔주는 내 개인용 도구', kind: 'api-enough', note: 'OCR API' },
  { request: '회의 녹음 파일을 올리면 글로 받아써 주는 개인용 도구', kind: 'api-enough', note: '음성 인식 API' },
  { request: '냉장고에 있는 재료를 적으면 AI가 레시피를 추천해주는 앱', kind: 'api-enough', note: 'LLM API 호출' },
];

// Written on 11/14 after the first run and before the training-floor rule existed, to check the
// rule on requests it was not shaped around.
const HELD_OUT: typeof CASES = [
  { request: '우리 집 고양이 울음소리를 듣고 기분을 맞혀주는 앱', kind: 'needs-training', note: '울음소리 데이터와 분류 모델' },
  { request: '손글씨 사진 몇 장으로 내 글씨체 폰트를 만들어주는 AI', kind: 'needs-training', note: '글씨체 생성 모델' },
  { request: '돌아가신 할머니 목소리로 동화책을 읽어주는 앱', kind: 'needs-training', note: '음성 복제 모델' },
  { request: '제주도 방언을 표준어로 번역해주는 앱', kind: 'needs-training', note: '방언 말뭉치와 번역 모델' },
  { request: '우리 공장 제품 사진을 모아서 불량품을 자동으로 찾아내는 AI', kind: 'needs-training', note: '불량 사진 수집·라벨링과 비전 모델' },
  { request: '영어 단어 학습 앱. AI가 단어마다 예문을 만들어줌', kind: 'api-enough', note: 'LLM API 호출 (사람이 학습하는 앱)' },
  { request: '여행지와 날짜를 넣으면 AI가 일정을 짜주는 웹사이트', kind: 'api-enough', note: 'LLM API 호출' },
  { request: '수학 문제 사진을 찍으면 풀이를 알려주는 내 개인용 앱', kind: 'api-enough', note: '이미지 입력 LLM API' },
];
const SET = process.env.SET === 'heldout' ? HELD_OUT : CASES;

// Does the text shown to the user say that a model has to be trained or data collected?
const TRAINING_WORDS = /학습|훈련|데이터\s?(수집|셋|확보|구축|라벨)|데이터셋|모델을?\s?(직접|새로|따로)|파인\s?튜닝|정확도|인식률|GPU|오탐|오인식|오진/i;

mkdirSync(OUT, { recursive: true });
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
const raw: unknown[] = [];
const per = new Map<string, { kind: Kind; note: string; tiers: string[]; warned: boolean[]; whys: string[]; domain: number[]; tech: number[]; features: number[] }>();

for (let rep = 0; rep < REPEAT; rep++) {
  for (const c of SET) {
    await pause(Number(process.env.PAUSE_MS ?? 4000));
    const res = await generateCards(llm, c.request);
    const f = res.data.feasibility;
    const shown = f ? [f.why, ...f.risks, f.scopeDown].join(' ') : '';
    const p = per.get(c.request) ?? { kind: c.kind, note: c.note, tiers: [], warned: [], whys: [], domain: [], tech: [], features: [] };
    p.tiers.push(res.source !== 'ai' ? '기본값' : (f?.tier ?? '판정 없음'));
    p.warned.push(TRAINING_WORDS.test(shown));
    p.whys.push(f?.why ?? '');
    if (res.source === 'ai') {
      p.domain.push(res.data.cards.filter((k) => k.kind === 'domain').length);
      p.tech.push(res.data.cards.filter((k) => k.kind === 'tech').length);
      p.features.push(res.data.features.length);
    }
    per.set(c.request, p);
    raw.push({ ...c, rep, source: res.source, feasibility: f, cards: res.data.cards.map((k) => ({ kind: k.kind, question: k.question })), features: res.data.features });
    console.log(`${c.kind} | ${c.request} → ${p.tiers.at(-1)} warned=${p.warned.at(-1)}`);
  }
}
writeFileSync(`${OUT}/results.json`, JSON.stringify(raw, null, 2));

const avg = (xs: number[]) => (xs.length ? (xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(1) : '-');
const rows = (kind: Kind) =>
  [...per.entries()]
    .filter(([, p]) => p.kind === kind)
    .map(([request, p]) => `| ${request} | ${p.note} | ${p.tiers.join(' · ')} | ${p.warned.map((w) => (w ? 'O' : 'X')).join(' · ')} | ${p.whys[0].replace(/\|/g, '/')} |`)
    .join('\n');
const runsOf = (kind: Kind) => [...per.values()].filter((p) => p.kind === kind);
const count = (kind: Kind, hit: (tier: string, warned: boolean) => boolean) =>
  runsOf(kind).reduce((n, p) => n + p.tiers.filter((t, i) => hit(t, p.warned[i])).length, 0);
const total = (kind: Kind) => runsOf(kind).reduce((n, p) => n + p.tiers.length, 0);
const all = [...per.values()];

writeFileSync(
  `${OUT}/README.md`,
  `# 서비스가 제 역할을 하는가: 요구사항 추가 · 숨은 난이도 판단

- 실행일: ${new Date().toISOString().slice(0, 10)} · 모델: 서비스와 동일 (gemini-flash-lite-latest, 실패 시 gemini-flash-latest) · 요청 ${SET.length}개 × ${REPEAT}회
- ${process.env.NOTE ?? ''}
- 화면에 나가는 결과 그대로(규칙 보정 포함) 기록. 분류와 기대는 실행 전에 적음 (Claude가 작성, 정답이 아님)

## 1. 요구사항을 미리 더해 주는가
한 줄 요청에 없던 것을 서비스가 몇 개 물어보거나 제안했는지 (요청당 평균, AI 응답이 온 실행만):
- 비즈니스 규칙 카드 ${avg(all.flatMap((p) => p.domain))}개 · 기술 선택 카드 ${avg(all.flatMap((p) => p.tech))}개 · 곧 필요해질 기능 제안 ${avg(all.flatMap((p) => p.features))}개
- 개수만 센 것이고, 그 질문이 실제로 쓸모 있었는지는 사람이 평가하지 않았음

## 2. 쉬워 보이지만 직접 학습이 필요한 AI 서비스를 잡아내는가
- '혼자 가능'이 아닌 판정(혼자는 어려움·사실상 불가능)을 낸 실행: ${count('needs-training', (t) => t === 'team' || t === 'enterprise')}/${total('needs-training')}
- 판정과 무관하게, 화면 문구(이유·위험·줄인 범위)에 학습·데이터·정확도 문제를 언급한 실행: ${count('needs-training', (_, w) => w)}/${total('needs-training')}
- 둘 다 놓친 실행 ('혼자 가능'이고 언급도 없음): ${count('needs-training', (t, w) => t === 'personal' && !w)}/${total('needs-training')}

| 요청 | 숨은 어려움 | 판정 (회차별) | 학습·데이터 언급 | 화면에 나간 이유 (1회차) |
|---|---|---|---|---|
${rows('needs-training')}

## 3. 기존 API로 되는 AI 서비스를 괜히 겁주지 않는가
- '혼자 가능' 판정을 낸 실행: ${count('api-enough', (t) => t === 'personal')}/${total('api-enough')}

| 요청 | 실제 필요한 것 | 판정 (회차별) | 학습·데이터 언급 | 화면에 나간 이유 (1회차) |
|---|---|---|---|---|
${rows('api-enough')}

## 한계
- 요청 ${SET.length}개 × ${REPEAT}회. 통계가 아니라 경향
- '학습·데이터 언급'은 단어 검사라, 언급했어도 설명이 부정확할 수 있음 (위 표의 이유 문장을 직접 볼 것)
- 원본: results.json
`,
);
console.log('written');
