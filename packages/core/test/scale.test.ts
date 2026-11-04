import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_PROFILE, MAX_SKILLS, calibrateBudget, calibrateDifficulty, fallbackBudget, maxMonthlyKrw, mergeSkills, parsePlan, recommendRules } from '../src/index.ts';
import type { Task } from '../src/index.ts';

const task = (title: string, difficulty: Task['difficulty']): Task => ({ title, done: '', difficulty, reason: 'r', watchouts: [], securityChecks: [] });

test('scale, performance and rate limiting are never rated below hard', () => {
  const t = calibrateDifficulty(task('대규모 트래픽 대비 성능 최적화 및 Rate Limiting 적용', 'medium'));
  assert.equal(t.difficulty, 'hard');
  assert.match(t.reason, /규칙 보정/);
  assert.equal(calibrateDifficulty(task('목록 화면 만들기', 'easy')).difficulty, 'easy');
});

test('a large scale is never budgeted as free', () => {
  const large = fallbackBudget({ ...DEFAULT_PROFILE, scale: 'large' });
  assert.equal(large.freeTier, 'none');
  assert.match(large.assumedScale, /수천/);
  assert.equal(fallbackBudget(DEFAULT_PROFILE).freeTier, 'full');
});

test('a large scale switches on load and rate-limit rules', () => {
  const on = recommendRules({ ...DEFAULT_PROFILE, scale: 'large' }).filter((r) => r.recommended).map((r) => r.rule.id);
  assert.ok(on.includes('eng-scale') && on.includes('sec-rate-limit'));
});

test('skill picks only come from the vetted catalog; focus checks need steps', () => {
  const plan = parsePlan({
    tasks: [{ title: 't', difficulty: 'easy' }],
    skills: [{ id: 'tdd', reason: '벌금 계산 회귀 방지' }, { id: 'made-up-skill', reason: 'x' }, { id: 'tdd', reason: 'dup' }],
    securityFocus: [{ what: '다른 회원 벌금 수정 불가', steps: ['B 계정으로 A 벌금 수정 시도'] }, { what: '단계 없음', steps: [] }],
  });
  assert.deepEqual(plan.skills, [{ id: 'tdd', reason: '벌금 계산 회귀 방지' }]);
  assert.equal(plan.securityFocus.length, 1);
});

test('a skill named by its display name is still recognised', () => {
  const plan = parsePlan({ tasks: [{ title: 't', difficulty: 'easy' }], skills: [{ id: 'test-driven-development', reason: 'r' }, { name: 'ponytail', reason: 'p' }] });
  assert.deepEqual(plan.skills.map((s) => s.id), ['tdd', 'ponytail']);
});

test('bare skill ids are kept, not dropped', () => {
  // Seen from Flash-Lite on 11/4: every pick vanished and the screen showed the generic list.
  const plan = parsePlan({ tasks: [{ title: 't', difficulty: 'easy' }], skills: ['stripe-best-practices', 'nope'] });
  assert.deepEqual(plan.skills, [{ id: 'stripe-best-practices', reason: '' }]);
});

test('a domain skill the profile calls for is added when the AI left it out, and listed first', () => {
  const shown = mergeSkills([{ id: 'writing-plans', reason: '' }], { ...DEFAULT_PROFILE, payment: 'yes', money: 'yes' });
  assert.equal(shown[0].skill.id, 'stripe-best-practices');
  assert.equal(shown[0].by, 'rule');
  const plans = shown.find((s) => s.skill.id === 'writing-plans');
  assert.equal(plans?.by, 'ai');
  assert.ok(plans?.reason, 'an AI pick without a reason still says something');
  assert.ok(shown.length <= MAX_SKILLS);
});

// The owner's test (#36): an AI-image detector on its own server came back as 1~4만원 a month.
test('a self-hosted model with a tiny estimate is flagged, the AI figure kept', () => {
  const budget = { freeTier: 'partial' as const, assumedScale: '100명', monthly: '1만원~4만원', summary: 's', items: [] };
  const flagged = calibrateBudget(budget, 'How to classify? → Deploy open-source AI models on our own server');
  assert.equal(flagged.monthly, '1만원~4만원');
  assert.equal(flagged.freeTier, 'none');
  assert.match(flagged.ruleNote ?? '', /GPU/);
  assert.equal(calibrateBudget({ ...budget, monthly: '30만원~80만원' }, 'GPU 서버').ruleNote, undefined);
  assert.equal(calibrateBudget(budget, '동아리 출석 앱').ruleNote, undefined);
});

test('won amounts are read from the usual ways of writing them', () => {
  assert.equal(maxMonthlyKrw('1만원~4만원'), 40000);
  assert.equal(maxMonthlyKrw('10,000~40,000원'), 40000);
  assert.equal(maxMonthlyKrw('0원~수만원'), 90000);
  assert.equal(maxMonthlyKrw('추정 불가'), null);
});

test('integrating an AI model is hard work', () => {
  assert.equal(calibrateDifficulty(task('오픈소스 AI 분류 모델 통합과 임계값 로직', 'medium')).difficulty, 'hard');
});
