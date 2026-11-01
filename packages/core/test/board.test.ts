import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_PROFILE,
  EMPTY_BOARD,
  boardKey,
  boardMarkdown,
  buildSpec,
  securityChecksFor,
  moveTask,
  taskCheckKey,
  toggleCheck,
  fallbackBudget,
  parsePlan,
} from '../src/index.ts';
import type { Profile, Task } from '../src/index.ts';

const tasks: Task[] = [
  { title: '로그인', done: '', difficulty: 'hard', reason: '', watchouts: ['세션 만료'], securityChecks: [{ what: '다른 계정 접근', how: '두 계정으로 시도' }] },
  { title: '목록', done: '', difficulty: 'easy', reason: '', watchouts: [], securityChecks: [] },
];

test('a task cannot reach done while a human check is unticked', () => {
  assert.throws(() => moveTask(EMPTY_BOARD, tasks, 0, 'done'), /사람 확인/);
  const ticked = toggleCheck(EMPTY_BOARD, taskCheckKey(0, 0));
  assert.equal(moveTask(ticked, tasks, 0, 'done').column[0], 'done');
});

test('a task with no human checks moves freely, and other moves never block', () => {
  assert.equal(moveTask(EMPTY_BOARD, tasks, 1, 'done').column[1], 'done');
  assert.equal(moveTask(EMPTY_BOARD, tasks, 0, 'verify').column[0], 'verify');
});

test('the same plan keeps its board; a different plan gets a new one', () => {
  assert.equal(boardKey('앱', tasks), boardKey('앱', tasks));
  assert.notEqual(boardKey('앱', tasks), boardKey('다른 앱', tasks));
});

test('an app that calls an AI or external API gets the key-exposure checks', () => {
  const ids = (p: Profile) => securityChecksFor(p).map((c) => c.id);
  assert.ok(!ids(DEFAULT_PROFILE).includes('key-in-browser'));
  const withApi = securityChecksFor({ ...DEFAULT_PROFILE, externalApi: 'yes' });
  assert.ok(withApi.some((c) => c.id === 'env-committed' && c.steps.some((s) => s.includes('.gitignore'))));
  assert.ok(withApi.some((c) => c.id === 'key-in-browser' && c.steps.some((s) => s.includes('Network'))));
});

test('the checklist is security only: a plain local app gets nothing to sign off', () => {
  assert.deepEqual(securityChecksFor(DEFAULT_PROFILE), []);
});

test('the budget never claims fully free for a paid-only setup, and the AI value is validated', () => {
  assert.notEqual(fallbackBudget({ ...DEFAULT_PROFILE, payment: 'yes' }).freeTier, 'full');
  assert.equal(fallbackBudget(DEFAULT_PROFILE).freeTier, 'full');
  const plan = parsePlan({ tasks: [{ title: 't', difficulty: 'easy' }], budget: { freeTier: 'totally', monthly: '0원' } });
  assert.equal(plan.budget.freeTier, 'partial');
});

test('markdown export reflects columns and ticks', () => {
  const state = moveTask(toggleCheck(EMPTY_BOARD, taskCheckKey(0, 0)), tasks, 0, 'done');
  const md = boardMarkdown(state, tasks, securityChecksFor(DEFAULT_PROFILE));
  assert.match(md, /- \[x\] #1 로그인/);
  assert.match(md, /- \[ \] #2 목록/);
  assert.match(md, /\[x\] 사람 확인: 다른 계정 접근/);
});

test('watch-outs reach the coding agent; human checks stay out of the spec', () => {
  const spec = buildSpec({ request: 'r', summary: '', domainRules: [], notes: '', decisions: [], rules: [], stack: [], tasks });
  assert.match(spec, /Watch out: 세션 만료/);
  assert.doesNotMatch(spec, /다른 계정 접근/);
});
