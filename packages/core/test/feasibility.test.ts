import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FALLBACK_CARDS, applyFloor, generateCards, parseCards, parseFeasibility, ruleFeasibility, statedGoal, tierFloor } from '../src/index.ts';
import type { Feasibility, LlmConfig } from '../src/index.ts';

const verdict = (tier: Feasibility['tier'], goal: Feasibility['goal'] = 'personal'): Feasibility =>
  ({ goal, tier, why: 'w', risks: [], goalAdds: [], scopeDown: '', raisedBy: null, by: 'ai' });

// The user's own test (11/2): the same animation tool, once for sale and once for personal use,
// came back as the same "team" verdict. Selling it adds real work; running it yourself does not.
const MV_SALE = '오픈소스 mv 만들기용 애니메이션 제작 툴. 개인용 테스트 가능하며 상업용 판매 예정';
const MV_OWN = '오픈소스 mv 만들기용 애니메이션 제작 툴. 개인 사용 및 오픈소스로 누구나 수정가능하게 하는 수준';

test('a stated commercial goal floors the tier at team; personal use alone does not', () => {
  assert.equal(statedGoal(MV_SALE), 'commercial');
  assert.equal(applyFloor(verdict('personal'), MV_SALE).tier, 'team');
  assert.equal(statedGoal(MV_OWN), 'public');
  assert.equal(applyFloor(verdict('personal'), MV_OWN).tier, 'personal');
});

test('"판매" in a description of the app is not a plan to sell it', () => {
  assert.equal(statedGoal('중고 판매글 정리해주는 앱'), null);
});

test('goal-specific work is kept for public and commercial, dropped for personal', () => {
  const raw = { goal: 'personal', tier: 'personal', why: 'w', goalAdds: ['결제'] };
  assert.deepEqual(parseFeasibility(raw)?.goalAdds, []);
  assert.deepEqual(parseFeasibility({ ...raw, goal: 'commercial', tier: 'team' })?.goalAdds, ['결제']);
});

test('crypto, finance and medical requests are enterprise whatever the wording', () => {
  for (const r of ['비트코인 거래소 만들어줘', '간단한 코인 지갑 앱', '주식 매매 자동화 웹', '환자 진료 기록 관리']) {
    assert.equal(tierFloor(r)?.tier, 'enterprise', r);
  }
});

test('everyday requests have no floor', () => {
  for (const r of ['동아리 출석체크 앱', '할 일 목록', '스터디 벌금 정산 웹사이트']) assert.equal(tierFloor(r), null, r);
});

test('the AI verdict is raised to the floor and the reason is kept', () => {
  const f = applyFloor(verdict('personal'), '비트코인 시세 보고 사고파는 서비스');
  assert.equal(f.tier, 'enterprise');
  assert.match(f.raisedBy ?? '', /암호화폐/);
});

test('the floor never lowers a harsher AI verdict', () => {
  assert.equal(applyFloor(verdict('enterprise'), '쇼핑몰').tier, 'enterprise');
  assert.equal(applyFloor(verdict('team'), '쇼핑몰').raisedBy, null);
});

test('without an AI verdict only the rule speaks, and nothing is invented for ordinary apps', () => {
  assert.equal(ruleFeasibility('할 일 앱'), null);
  const f = ruleFeasibility('코인 거래소');
  assert.equal(f?.by, 'rule');
  assert.deepEqual(f?.risks, []);
});

test('a malformed verdict is dropped without dropping the cards', () => {
  assert.equal(parseFeasibility({ tier: 'huge', why: 'x' }), null);
  assert.equal(parseFeasibility({ tier: 'team', why: '' }), null);
  const parsed = parseCards({ feasibility: { tier: 'nope' }, cards: [{ question: 'q', options: [{ label: 'a' }, { label: 'b' }] }] });
  assert.equal(parsed.cards.length, 1);
  assert.equal(parsed.feasibility, null);
});

test('when the model fails, a risky request still gets its rule verdict', async () => {
  const llm: LlmConfig = { baseUrl: 'http://x', apiKey: 'k', models: ['m'], fetch: async () => new Response('', { status: 503 }) };
  const res = await generateCards(llm, '비트코인 거래소');
  assert.equal(res.source, 'fallback');
  assert.equal(res.data.cards, FALLBACK_CARDS);
  assert.equal(res.data.feasibility?.tier, 'enterprise');
});

test('telling AI images from hand-drawn ones is enterprise-sized (#36)', () => {
  assert.equal(tierFloor('AI가 그린 그림인지 사람이 그린 그림인지 판별하는 프로그램')?.tier, 'enterprise');
  assert.equal(tierFloor('딥페이크 영상 탐지 서비스')?.tier, 'enterprise');
  assert.equal(tierFloor('AI로 그림 그려주는 앱'), null);
});

test('a raised verdict carries the rule reason, not the AI reason that argued for less', () => {
  const f = applyFloor({ ...verdict('personal'), why: '1인 개발로 충분히 가능' }, 'AI가 그린 그림인지 판별하는 프로그램');
  assert.equal(f.tier, 'enterprise');
  assert.equal(f.aiTier, 'personal');
  assert.doesNotMatch(f.why, /1인 개발/);
});
