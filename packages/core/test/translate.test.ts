import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSpec, translatableTexts, translateToEnglish, withTexts } from '../src/index.ts';
import type { LlmConfig } from '../src/index.ts';

// A fake model that answers each call from a list, so a first pass and its retry can differ.
function scripted(...answers: string[][]): { llm: LlmConfig; calls: string[][] } {
  const calls: string[][] = [];
  const llm: LlmConfig = {
    baseUrl: 'http://x',
    apiKey: 'k',
    models: ['m'],
    fetch: async (_url, init) => {
      const user = JSON.parse(String(init?.body)).messages.at(-1).content;
      calls.push(JSON.parse(user).lines);
      const lines = answers[calls.length - 1];
      if (!lines) return new Response('', { status: 503 });
      return Response.json({ choices: [{ message: { content: JSON.stringify({ lines }) } }] });
    },
  };
  return { llm, calls };
}

test('a line the model leaves in Korean is sent again, alone', async () => {
  const { llm, calls } = scripted(['Attendance', '지각 벌금'], ['Late fine']);
  const res = await translateToEnglish(llm, ['출석', '지각 벌금']);
  assert.deepEqual(res.lines, ['Attendance', 'Late fine']);
  assert.deepEqual(calls[1], ['지각 벌금']);
  assert.equal(res.untranslated, 0);
});

test('what is still Korean after the retry is counted, not hidden', async () => {
  const { llm } = scripted(['Attendance', '지각 벌금'], ['여전히 한국어']);
  const res = await translateToEnglish(llm, ['출석', '지각 벌금']);
  assert.equal(res.source, 'ai');
  assert.equal(res.untranslated, 1);
});

test('a failed translation keeps the Korean and says how much of it there is', async () => {
  const { llm } = scripted();
  const res = await translateToEnglish(llm, ['출석', 'React', '']);
  assert.equal(res.source, 'fallback');
  assert.equal(res.untranslated, 1);
});

test('a stack choice written in Korean reaches the translator', () => {
  const input = {
    request: 'r', summary: '', domainRules: [], notes: '', decisions: [], tasks: [], rules: [],
    stack: [{ area: '데이터 저장', choice: '로컬 저장소', why: '간단함', connects: '' }],
  };
  assert.ok(translatableTexts(input).includes('로컬 저장소'));
  const en = buildSpec(withTexts(input, ['r', '', '', 'Data storage', 'Local storage', 'Simple']), 'en');
  assert.doesNotMatch(en.split('## Recommended stack')[1], /[가-힣]/);
});
