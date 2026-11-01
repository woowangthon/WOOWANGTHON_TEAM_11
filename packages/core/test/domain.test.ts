import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CUSTOM_ANSWER,
  DEFAULT_PROFILE,
  buildSpec,
  deriveProfile,
  findRule,
  parseCards,
  recommendRules,
  stackWarnings,
  toDomainRules,
} from '../src/index.ts';

const raw = {
  cards: [
    {
      kind: 'domain',
      question: '지각은 벌금에서 어떻게 처리할까요?',
      options: [
        { label: '결석과 동일', policy: '지각은 결석과 같은 벌금을 적용한다.', recommended: true },
        { label: '별도 벌금', policy: '지각은 결석과 별도의 벌금을 적용한다.', sets: { money: 'yes' } },
      ],
    },
    { question: '어디서 쓰나요?', options: [{ label: '웹', sets: { platform: 'web' }, policy: '이건 무시돼야 함' }, { label: '앱' }] },
  ],
};

test('domain choices become spec rules; tech cards never carry a policy', () => {
  const { cards } = parseCards(raw);
  assert.equal(cards[0].kind, 'domain');
  assert.equal(cards[1].kind, 'tech');
  assert.equal(cards[1].options[0].policy, '');
  const rules = toDomainRules(cards, { c1: 'o2', c2: 'o1' });
  assert.deepEqual(rules, ['지각은 결석과 별도의 벌금을 적용한다.']);
  const spec = buildSpec({ request: 'r', summary: '', domainRules: rules, decisions: [], notes: '', rules: [], tasks: [], stack: [] });
  assert.match(spec, /## Domain rules[\s\S]*별도의 벌금/);
});

test('a typed answer on a domain card is kept as the rule', () => {
  const { cards } = parseCards(raw);
  const rules = toDomainRules(cards, { c1: CUSTOM_ANSWER }, { c1: '지각 3번이면 결석 1번' });
  assert.match(rules[0], /지각 3번이면 결석 1번/);
});

test('money brings the integrity rule; payments imply money', () => {
  const on = (p: typeof DEFAULT_PROFILE) => recommendRules(p).some((r) => r.rule.id === 'sec-money-integrity' && r.recommended);
  assert.ok(!on(DEFAULT_PROFILE));
  assert.ok(on({ ...DEFAULT_PROFILE, money: 'yes' }));
  const { cards } = parseCards({ cards: [{ question: '결제?', options: [{ label: '예', sets: { payment: 'yes' } }, { label: '아니오' }] }] });
  assert.equal(deriveProfile(cards, { c1: 'o1' }).money, 'yes');
  assert.match(findRule('sec-money-integrity').instruction, /idempotent/);
});

test('engineering rules read as intent, not absolute limits', () => {
  assert.match(findRule('eng-file-size').instruction, /not a target/);
  assert.match(findRule('eng-single-source').instruction, /same fact/);
});

test('stack warnings catch a second login system next to a provider that has one', () => {
  const w = stackWarnings([
    { area: '데이터 저장', choice: 'Supabase PostgreSQL + Prisma', why: '', connects: '' },
    { area: '로그인', choice: 'NextAuth.js', why: '', connects: '' },
  ]);
  assert.equal(w.length, 1);
  assert.match(w[0], /어느 쪽이 관리할지/);
  assert.deepEqual(stackWarnings([{ area: '로그인', choice: 'Supabase Auth', why: '', connects: '' }]), []);
});

test('every option carries a difficulty; unknown levels fall back to medium', () => {
  const { cards } = parseCards({ cards: [{ question: 'q', options: [{ label: 'a', difficulty: 'hard', effort: '웹훅' }, { label: 'b', difficulty: 'insane' }] }] });
  assert.deepEqual(cards[0].options.map((o) => o.difficulty), ['hard', 'medium']);
  assert.equal(cards[0].options[0].effort, '웹훅');
});
