import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_RULES,
  DEFAULT_PROFILE,
  FALLBACK_CARDS,
  PROFILE_SCHEMA,
  buildSpec,
  deriveProfile,
  extractJson,
  fallbackTasks,
  generateCards,
  parseCards,
  recommendRules,
  recommendedAnswers,
  toDecisions,
  translatableTexts,
  withTexts,
  CUSTOM_ANSWER,
  recommendSkills,
} from '../src/index.ts';
import type { LlmConfig, Profile } from '../src/index.ts';

test('fallback cards only set keys and values the rules understand', () => {
  for (const card of FALLBACK_CARDS) {
    for (const option of card.options) {
      for (const [key, value] of Object.entries(option.sets)) {
        assert.ok(key in PROFILE_SCHEMA, `${card.id}.${option.id}: unknown key ${key}`);
        assert.ok((PROFILE_SCHEMA as Record<string, readonly string[]>)[key].includes(value as string));
      }
    }
  }
});

test('every fallback card has exactly one recommended option', () => {
  for (const card of FALLBACK_CARDS) {
    assert.equal(card.options.filter((o) => o.recommended).length, 1, card.id);
  }
});

test('accepting every recommendation yields the default profile', () => {
  // The defaults and the recommended fallback answers describe the same simplest project;
  // if they drift, a user who clicks nothing gets rules for a project they did not describe.
  assert.deepEqual(deriveProfile(FALLBACK_CARDS, recommendedAnswers(FALLBACK_CARDS)), DEFAULT_PROFILE);
});

test('deriveProfile throws on an answer that is not an option', () => {
  assert.throws(() => deriveProfile(FALLBACK_CARDS, { auth: 'nope' }), /not an option/);
});

test('choosing a login implies multiple users even if the card did not say so', () => {
  const cards = [{ id: 'c1', question: 'q', why: '', options: [
    { id: 'o1', label: 'a', detail: '', recommended: true, sets: { auth: 'email' as const } },
    { id: 'o2', label: 'b', detail: '', recommended: false, sets: {} },
  ] }];
  const profile = deriveProfile(cards, { c1: 'o1' });
  assert.equal(profile.users, 'multi');
  assert.ok(recommendRules({ ...profile, storage: 'server-db' }).some((r) => r.rule.id === 'sec-authz' && r.recommended));
});

test('every rule appears exactly once', () => {
  const ids = ALL_RULES.map((r) => r.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('a riskier profile never recommends fewer security rules', () => {
  const count = (p: Profile) =>
    recommendRules(p).filter((r) => r.recommended && r.rule.category === 'security').length;
  const risky: Profile = {
    ...DEFAULT_PROFILE,
    auth: 'email',
    users: 'multi',
    storage: 'server-db',
    upload: 'yes',
    payment: 'yes',
    externalApi: 'yes',
    stage: 'production',
  };
  assert.ok(count(risky) > count(DEFAULT_PROFILE));
  assert.ok(recommendRules(DEFAULT_PROFILE).some((r) => r.rule.id === 'sec-secrets' && r.recommended));
});

test('a recommended rule always carries a reason', () => {
  for (const r of recommendRules(DEFAULT_PROFILE)) assert.equal(r.recommended, r.reason !== null);
});

test('parseCards rejects unknown profile keys instead of ignoring them', () => {
  const raw = { cards: [{ question: 'q', options: [{ label: 'a', sets: { colour: 'red' } }, { label: 'b' }] }] };
  assert.throws(() => parseCards(raw), /unknown profile key/);
});

test('parseCards assigns unique ids and exactly one recommendation', () => {
  const raw = {
    cards: [
      { question: 'q1', options: [{ label: 'a', recommended: true }, { label: 'b', recommended: true }] },
      { question: 'q2', options: [{ label: 'a' }, { label: 'b' }] },
    ],
  };
  const { cards } = parseCards(raw);
  assert.deepEqual(cards.map((c) => c.id), ['c1', 'c2']);
  for (const c of cards) assert.equal(c.options.filter((o) => o.recommended).length, 1);
});

test('extractJson handles fenced output', () => {
  assert.deepEqual(extractJson('```json\n{"a":1}\n```'), { a: 1 });
});

test('generateCards falls back and says why when the model fails', async () => {
  const llm: LlmConfig = {
    baseUrl: 'http://x',
    apiKey: 'k',
    models: ['m1', 'm2'],
    fetch: async () => new Response('busy', { status: 429 }),
  };
  const res = await generateCards(llm, '할 일 앱');
  assert.equal(res.source, 'fallback');
  assert.equal(res.data.cards, FALLBACK_CARDS);
  assert.match(res.error ?? '', /all models failed/);
});

test('generateCards uses the second model when the first is rate-limited', async () => {
  const good = { cards: [{ question: 'q', options: [{ label: 'a' }, { label: 'b' }] }] };
  const llm: LlmConfig = {
    baseUrl: 'http://x',
    apiKey: 'k',
    models: ['m1', 'm2'],
    fetch: async (_url, init) => {
      const model = JSON.parse(String(init?.body)).model;
      if (model === 'm1') return new Response('', { status: 429 });
      return Response.json({ choices: [{ message: { content: JSON.stringify(good) } }] });
    },
  };
  const res = await generateCards(llm, '할 일 앱');
  assert.equal(res.source, 'ai');
  assert.equal(res.model, 'm2');
});

test('buildSpec includes every decision and only the chosen rules', () => {
  const answers = recommendedAnswers(FALLBACK_CARDS);
  const rules = ALL_RULES.filter((r) => r.id === 'sec-secrets');
  const spec = buildSpec({
    request: '할 일 앱',
    summary: '',
    decisions: toDecisions(FALLBACK_CARDS, answers),
    notes: '',
    rules,
    tasks: fallbackTasks(DEFAULT_PROFILE),
  });
  for (const card of FALLBACK_CARDS) assert.ok(spec.includes(card.question), card.id);
  assert.ok(spec.includes('## Security rules'));
  assert.ok(!spec.includes('## Engineering rules'));
});

test('toDecisions refuses an unanswered card', () => {
  assert.throws(() => toDecisions(FALLBACK_CARDS, {}), /no answer/);
});

test('a typed answer becomes the decision text and counts as the recommended option for rules', () => {
  const cards = FALLBACK_CARDS.map((c) =>
    c.id === 'auth' ? { ...c, options: c.options.map((o) => ({ ...o, recommended: o.id === 'email' })) } : c,
  );
  const answers = { ...recommendedAnswers(cards), auth: CUSTOM_ANSWER };
  const decisions = toDecisions(cards, answers, { auth: '관리자 한 명만 비밀번호로' });
  assert.equal(decisions.find((d) => d.question.includes('로그인'))?.answer, '관리자 한 명만 비밀번호로');
  assert.equal(deriveProfile(cards, answers).auth, 'email');
  assert.throws(() => toDecisions(FALLBACK_CARDS, answers, { auth: '  ' }), /비어 있습니다/);
});

test('every rule has a Korean instruction', () => {
  for (const r of ALL_RULES) assert.ok(r.instructionKo.trim(), r.id);
});

test('withTexts is the exact inverse of translatableTexts', () => {
  const input = {
    request: 'r', summary: '', notes: 'n', rules: [],
    decisions: [{ question: 'q', answer: 'a' }],
    tasks: [{ title: 't', done: 'd' }],
  };
  assert.deepEqual(withTexts(input, translatableTexts(input)), input);
  assert.throws(() => withTexts(input, ['x']), /expected/);
});

test('the Korean spec uses Korean instructions and keeps the same sections', () => {
  const input = {
    request: 'r', summary: '', notes: '메모', decisions: [], tasks: [],
    rules: ALL_RULES.filter((r) => r.id === 'sec-secrets'),
  };
  const ko = buildSpec(input, 'ko');
  assert.match(ko, /## 보안 규칙/);
  assert.match(ko, /환경변수에서 읽고/);
  assert.match(ko, /## 주인이 덧붙인 말/);
  assert.match(buildSpec(input, 'en'), /## Additional notes from the owner/);
});

test('skill recommendations: ask-first always, more for a production multi-user web app', () => {
  const base = recommendSkills(DEFAULT_PROFILE).map((s) => s.skill.id);
  assert.ok(base.includes('ask-first'));
  const prod = recommendSkills({ ...DEFAULT_PROFILE, stage: 'production', users: 'multi' }).map((s) => s.skill.id);
  assert.ok(prod.length > base.length);
  assert.ok(prod.includes('tdd') && prod.includes('engineering-guardrails'));
});
