import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_PROFILE, calibrateDifficulty, fallbackBudget, parsePlan, recommendRules } from '../src/index.ts';
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
