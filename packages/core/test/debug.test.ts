import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_PROFILE, buildDebugRecord, debugFileName } from '../src/index.ts';

const base = {
  app: { commit: 'abc1234' },
  ai: { provider: 'anthropic', model: 'claude-opus-5-5' },
  request: 'AI 그림 판별기 / 이미지 업로드',
  cards: null, answers: {}, custom: {}, notes: '', featureChoices: {}, ruleOverrides: {},
  profile: DEFAULT_PROFILE, selectedRuleIds: [], tasks: null, translation: null, spec: null,
};

test('the record is self-describing and survives a JSON round trip', () => {
  const r = buildDebugRecord(base, new Date('2026-11-04T07:51:00Z'));
  assert.equal(r.kind, 'spec-companion-run');
  assert.deepEqual(JSON.parse(JSON.stringify(r)), r);
  assert.equal(debugFileName(r), 'run-202611040751-AI-그림-판별기-이미지-업로드.json');
});

test('no field can carry a key', () => {
  const text = JSON.stringify(buildDebugRecord(base));
  assert.doesNotMatch(text, /"key"/);
});
