import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildFixPrompt, findRule, mergeFindings, parseFindings, reviewCode, staticFindings } from '../src/index.ts';
import type { Finding, LlmConfig } from '../src/index.ts';

const rules = ['sec-secrets', 'eng-no-silent-failure', 'eng-file-size', 'sec-input-validation'].map((id) => findRule(id));

test('static checks catch a hardcoded key and an empty catch', () => {
  const code = `const API_KEY = "sk_live_abcdefghijklmnop";\ntry { go() } catch (e) {}`;
  const ids = staticFindings(code, rules).map((f) => f.ruleId).sort();
  assert.deepEqual(ids, ['eng-no-silent-failure', 'sec-secrets']);
});

test('static checks stay quiet on clean code', () => {
  const code = 'const key = process.env.API_KEY;\ntry { go() } catch (e) { console.error(e); throw e; }';
  assert.deepEqual(staticFindings(code, rules), []);
});

test('file-size check reads per-file headers', () => {
  const big = Array.from({ length: 320 }, () => 'x').join('\n');
  const code = `=== a.ts ===\nsmall\n=== b.ts ===\n${big}`;
  const [f] = staticFindings(code, [findRule('eng-file-size')]);
  assert.match(f.evidence, /b\.ts/);
  assert.doesNotMatch(f.evidence, /a\.ts/);
});

test('parseFindings rejects a rule id that was not sent', () => {
  assert.throws(() => parseFindings({ findings: [{ ruleId: 'made-up', verdict: 'ok' }] }, new Set(['sec-secrets'])), /unknown rule/);
});

test('an entry with no rule id is dropped without losing the rest', () => {
  const raw = { findings: [{ ruleId: 'sec-secrets', verdict: 'violation' }, { ruleId: '', verdict: 'ok' }, { verdict: 'ok' }] };
  assert.deepEqual(parseFindings(raw, new Set(['sec-secrets'])).map((f) => f.ruleId), ['sec-secrets']);
});

test('a rule-found violation is not overridden by the model saying ok', () => {
  const rule: Finding = { ruleId: 'sec-secrets', verdict: 'violation', evidence: 'k', fix: 'f', by: 'rule' };
  const ai: Finding = { ruleId: 'sec-secrets', verdict: 'ok', evidence: '', fix: '', by: 'ai' };
  assert.deepEqual(mergeFindings([rule], [ai]), [rule]);
});

test('reviewCode keeps rule findings when the model is down', async () => {
  const llm: LlmConfig = { baseUrl: 'http://x', apiKey: 'k', models: ['m'], fetch: async () => new Response('', { status: 503 }) };
  const res = await reviewCode(llm, 'catch (e) {}', rules);
  assert.equal(res.source, 'fallback');
  assert.deepEqual(res.findings.map((f) => f.ruleId), ['eng-no-silent-failure']);
});

test('buildFixPrompt lists only the chosen findings and refuses none', () => {
  const f: Finding = { ruleId: 'sec-secrets', verdict: 'violation', evidence: 'KEY="x"', fix: '환경변수로 옮기세요', by: 'rule' };
  const prompt = buildFixPrompt([f], rules);
  assert.match(prompt, /비밀키는 코드에 넣지 않기/);
  assert.throws(() => buildFixPrompt([], rules), /no findings/);
});
