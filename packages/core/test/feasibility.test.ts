import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FALLBACK_CARDS, applyFloor, generateCards, parseCards, parseFeasibility, ruleFeasibility, tierFloor } from '../src/index.ts';
import type { Feasibility, LlmConfig } from '../src/index.ts';

const verdict = (tier: Feasibility['tier']): Feasibility => ({ tier, why: 'w', risks: [], scopeDown: '', raisedBy: null, by: 'ai' });

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
