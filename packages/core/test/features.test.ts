import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSpec, defaultFeatureChoices, generateCards, parseCards, parseFeatures, splitFeatures, translatableTexts, withTexts } from '../src/index.ts';
import { tasksUser } from '../src/prompts.ts';
import type { LlmConfig } from '../src/index.ts';

const IDEAS = parseFeatures([
  { name: '작업 저장·불러오기', why: '편집하던 걸 닫으면 날아감', difficulty: 'easy', essential: true },
  { name: '실행 취소', why: '실수 한 번에 처음부터', difficulty: 'medium' },
  { name: '영상 내보내기', why: '결과를 공유하려면 필요', difficulty: 'hard' },
]);

test('ideas get ids, a bad one is skipped and the rest kept', () => {
  const ideas = parseFeatures([{ name: '' }, { name: 'a', difficulty: 'impossible' }, { name: 'a' }, 'x']);
  assert.deepEqual(ideas.map((f) => [f.id, f.name, f.difficulty]), [['f1', 'a', 'medium']]);
});

test('essential ideas start as now, the rest as later', () => {
  assert.deepEqual(defaultFeatureChoices(IDEAS), { f1: 'now', f2: 'later', f3: 'later' });
});

test('dropped ideas vanish; later ones reach the plan prompt as room to leave, not tasks', () => {
  const chosen = splitFeatures(IDEAS, { f1: 'now', f2: 'later', f3: 'no' });
  assert.equal(chosen.now.length, 1);
  assert.deepEqual(chosen.later, ['실행 취소: 실수 한 번에 처음부터']);
  const user = tasksUser('편집기', [], [], '', [], undefined, chosen);
  assert.match(user, /Also build these features[\s\S]*작업 저장/);
  assert.match(user, /Planned for later \(no tasks now; keep the structure open[\s\S]*실행 취소/);
  assert.doesNotMatch(user, /영상 내보내기/);
});

test('the spec lists later features with a note to keep room for them, in both languages', () => {
  const input = {
    request: 'r', summary: '', domainRules: [], notes: '', decisions: [], tasks: [], stack: [], rules: [],
    features: { now: ['Save and reopen'], later: ['Undo'] },
  };
  const en = buildSpec(input, 'en');
  assert.match(en, /## Features to include\n- Save and reopen/);
  assert.match(en, /## Planned for later \(do not build yet\)\nKeep the structure open[^\n]*\n- Undo/);
  assert.match(buildSpec(input, 'ko'), /## 나중에 추가할 기능/);
  assert.deepEqual(withTexts(input, translatableTexts(input)), input);
});

test('no ideas are made up when the model fails', async () => {
  const llm: LlmConfig = { baseUrl: 'http://x', apiKey: 'k', models: ['m'], fetch: async () => new Response('', { status: 503 }) };
  assert.deepEqual((await generateCards(llm, '편집기')).data.features, []);
  assert.deepEqual(parseCards({ cards: [{ question: 'q', options: [{ label: 'a' }, { label: 'b' }] }] }).features, []);
});
