import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PROVIDERS, byokConfig, chatJson } from '../src/index.ts';

const KEY = 'sk-test_abcdefghijklmnopqrstuvwxyz0123';

test('no key and no provider means the server key is used', () => {
  assert.equal(byokConfig({ provider: null, key: null, model: null }), null);
});

test('the base URL always comes from the fixed table, never from the request', () => {
  const cfg = byokConfig({ provider: 'openai', key: KEY, model: 'gpt-x' });
  assert.equal(cfg?.baseUrl, PROVIDERS.openai.baseUrl);
});

test('unknown providers, malformed keys and odd model names are rejected', () => {
  assert.throws(() => byokConfig({ provider: 'evil', key: KEY, model: null }), /지원하지 않는/);
  assert.throws(() => byokConfig({ provider: '__proto__', key: KEY, model: null }), /지원하지 않는/);
  assert.throws(() => byokConfig({ provider: 'anthropic', key: 'short', model: null }), /키 형식/);
  assert.throws(() => byokConfig({ provider: 'anthropic', key: `${KEY}\nX-Evil: 1`, model: null }), /키 형식/);
  assert.throws(() => byokConfig({ provider: 'anthropic', key: KEY, model: '../../admin' }), /모델 이름/);
  assert.throws(() => byokConfig({ provider: 'openai', key: KEY, model: null }), /모델 이름을 입력/);
});

test('a failed call never puts the key into the error', async () => {
  for (const provider of ['openai', 'anthropic'] as const) {
    const cfg = byokConfig({ provider, key: KEY, model: provider === 'openai' ? 'gpt-x' : 'claude-haiku-5-5' });
    assert.ok(cfg);
    const err = await chatJson(
      { ...cfg, fetch: async () => new Response(JSON.stringify({ error: { message: `bad key ${KEY}` } }), { status: 401, headers: { 'content-type': 'application/json' } }) },
      's',
      'u',
    ).catch((e: Error & { attempts?: string[] }) => e);
    assert.ok(err instanceof Error);
    const text = `${err.message} ${(err as { attempts?: string[] }).attempts?.join(' ') ?? ''}`;
    assert.ok(!text.includes(KEY), `${provider} leaked the key: ${text}`);
  }
});
