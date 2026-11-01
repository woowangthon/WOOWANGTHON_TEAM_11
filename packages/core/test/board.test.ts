import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_PROFILE,
  EMPTY_BOARD,
  boardKey,
  boardMarkdown,
  buildSpec,
  humanChecksFor,
  moveTask,
  taskCheckKey,
  toggleCheck,
} from '../src/index.ts';
import type { Task } from '../src/index.ts';

const tasks: Task[] = [
  { title: '로그인', done: '', difficulty: 'hard', reason: '', watchouts: ['세션 만료'], humanChecks: [{ what: '다른 계정 접근', how: '두 계정으로 시도' }] },
  { title: '목록', done: '', difficulty: 'easy', reason: '', watchouts: [], humanChecks: [] },
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

test('an app that calls an AI or external API gets the secret-leak check', () => {
  assert.ok(!humanChecksFor(DEFAULT_PROFILE).some((c) => c.id === 'secret-leak'));
  const withApi = humanChecksFor({ ...DEFAULT_PROFILE, externalApi: 'yes' });
  const leak = withApi.find((c) => c.id === 'secret-leak');
  assert.ok(leak && leak.steps.some((s) => s.includes('Network')));
  assert.ok(humanChecksFor(DEFAULT_PROFILE).some((c) => c.id === 'run-it-yourself'));
});

test('markdown export reflects columns and ticks', () => {
  const state = moveTask(toggleCheck(EMPTY_BOARD, taskCheckKey(0, 0)), tasks, 0, 'done');
  const md = boardMarkdown(state, tasks, humanChecksFor(DEFAULT_PROFILE));
  assert.match(md, /- \[x\] #1 로그인/);
  assert.match(md, /- \[ \] #2 목록/);
  assert.match(md, /\[x\] 사람 확인: 다른 계정 접근/);
});

test('watch-outs reach the coding agent; human checks stay out of the spec', () => {
  const spec = buildSpec({ request: 'r', summary: '', notes: '', decisions: [], rules: [], stack: [], tasks });
  assert.match(spec, /Watch out: 세션 만료/);
  assert.doesNotMatch(spec, /다른 계정 접근/);
});
