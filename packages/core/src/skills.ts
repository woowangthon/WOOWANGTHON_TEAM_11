import type { Profile } from './types.ts';

export interface SkillRec {
  id: string;
  name: string;
  /** GitHub owner/repo; every entry was checked to exist when added. */
  repo: string;
  what: string;
  install: string;
  /** 'domain' skills target one kind of work (payments, a database); 'general' ones help every project a little. */
  kind: 'domain' | 'general';
  /** Returns why this project should use it, or null. Rule-based, like the rule presets. */
  appliesTo: (p: Profile) => string | null;
}

// Claude Code skills that cover what the spec alone cannot: the spec is read once at the
// start, a skill keeps steering the agent on every turn. Listed in priority order.
export const SKILLS: SkillRec[] = [
  {
    id: 'verification-before-completion',
    name: 'verification-before-completion',
    repo: 'obra/superpowers',
    what: '완료라고 말하기 전에 실제로 실행해서 확인하게 합니다.',
    install: '/plugin marketplace add obra/superpowers',
    kind: 'general',
    appliesTo: () => '"다 됐어요" 하고 안 돌아가는 코드를 받는 일이 다시 묻는 왕복의 가장 흔한 원인',
  },
  {
    id: 'ponytail',
    name: 'ponytail',
    repo: 'DietrichGebert/ponytail',
    what: '새 코드를 쓰기 전에 기존 코드·표준 라이브러리를 먼저 쓰게 해 코드와 토큰을 줄입니다.',
    install: '/plugin marketplace add DietrichGebert/ponytail',
    kind: 'general',
    appliesTo: () => '수정 단계에서 코드와 토큰을 줄임 (독립 테스트에서 작업당 약 10%)',
  },
  {
    id: 'frontend-design',
    name: 'frontend-design',
    repo: 'anthropics/skills',
    what: '화면을 만들 때 일관된 디자인 원칙을 따르게 합니다.',
    install: '/plugin marketplace add anthropics/skills',
    kind: 'general',
    appliesTo: (p) => (p.platform === 'web' || p.platform === 'mobile' ? '화면이 있는 앱이라 디자인이 들쭉날쭉해지기 쉬움' : null),
  },
  {
    id: 'tdd',
    name: 'test-driven-development',
    repo: 'obra/superpowers',
    what: '기능보다 테스트를 먼저 쓰게 해서, 고치다 다른 기능을 깨뜨리는 일을 막습니다.',
    install: '/plugin marketplace add obra/superpowers',
    kind: 'general',
    appliesTo: (p) => (p.stage === 'production' ? '실제 서비스로 공개할 예정이라 회귀를 막아야 함' : null),
  },
  {
    id: 'webapp-testing',
    name: 'webapp-testing',
    repo: 'anthropics/skills',
    what: '브라우저로 웹앱을 직접 띄워 동작을 확인하게 합니다.',
    install: '/plugin marketplace add anthropics/skills',
    kind: 'general',
    appliesTo: (p) => (p.platform === 'web' && p.stage === 'production' ? '공개할 웹앱이라 실제 화면 동작 확인이 필요함' : null),
  },
  {
    id: 'systematic-debugging',
    name: 'systematic-debugging',
    repo: 'obra/superpowers',
    what: '버그를 추측으로 고치지 않고 원인을 좁혀 가며 찾게 합니다.',
    install: '/plugin marketplace add obra/superpowers',
    kind: 'general',
    appliesTo: (p) =>
      p.storage === 'server-db' || p.externalApi === 'yes' ? '서버·외부 서비스 연동은 원인 모를 오류가 잦음' : null,
  },
  // Domain skills from the vendors and security firms that own the domain (each repo and skill
  // folder checked on GitHub, 2026-11-04). Generic process skills above help every project a little;
  // these help the projects that touch that domain a lot, which is what the owner asked for.
  {
    id: 'stripe-best-practices',
    name: 'stripe-best-practices',
    repo: 'stripe/ai',
    what: 'Stripe 결제를 최신 권장 방식(웹훅 검증, 서버측 금액 확정, 환불 처리)으로 만들게 합니다.',
    install: '/plugin marketplace add stripe/ai',
    kind: 'domain',
    appliesTo: (p) => (p.payment === 'yes' ? '결제 연동은 웹훅·금액 검증을 빠뜨리면 돈이 새는 부분' : null),
  },
  {
    id: 'property-based-testing',
    name: 'property-based-testing',
    repo: 'trailofbits/skills',
    what: '계산 규칙을 무작위 입력 수백 개로 검사하는 테스트를 쓰게 해 경계값 실수를 잡습니다.',
    install: '/plugin marketplace add trailofbits/skills',
    kind: 'domain',
    appliesTo: (p) => (p.money === 'yes' ? '벌금·회비·잔액 계산은 0원·음수·반올림 같은 경계에서 틀리기 쉬움' : null),
  },
  {
    id: 'insecure-defaults',
    name: 'insecure-defaults',
    repo: 'trailofbits/skills',
    what: '기본값으로 열려 있는 설정(공개 DB, 디버그 모드, 약한 비밀번호 정책)을 찾아 막게 합니다.',
    install: '/plugin marketplace add trailofbits/skills',
    kind: 'domain',
    appliesTo: (p) => (p.storage === 'server-db' || p.auth !== 'none' ? '서버 DB·로그인은 기본 설정 그대로 배포했다가 열리는 사고가 잦음' : null),
  },
  {
    id: 'supabase-postgres-best-practices',
    name: 'supabase-postgres-best-practices',
    repo: 'supabase/agent-skills',
    what: 'Supabase·Postgres의 접근 규칙(RLS), 인덱스, 쿼리를 권장 방식으로 쓰게 합니다.',
    install: '/plugin marketplace add supabase/agent-skills',
    kind: 'domain',
    appliesTo: (p) => (p.storage === 'server-db' ? '서버 DB의 접근 규칙(RLS) 누락이 바이브코딩 앱 데이터 유출의 대표 원인' : null),
  },
  {
    id: 'supply-chain-risk-auditor',
    name: 'supply-chain-risk-auditor',
    repo: 'trailofbits/skills',
    what: '추가하는 패키지가 실제로 있는지, 관리되는지, 위험하지 않은지 확인하게 합니다.',
    install: '/plugin marketplace add trailofbits/skills',
    kind: 'domain',
    appliesTo: (p) => (p.stage === 'production' ? 'AI가 없는 패키지 이름을 지어내거나 버려진 패키지를 넣는 일을 막음' : null),
  },
  {
    id: 'react-best-practices',
    name: 'react-best-practices',
    repo: 'vercel-labs/agent-skills',
    what: 'React 화면을 불필요한 다시 그리기·상태 꼬임 없이 만드는 Vercel의 권장 규칙을 따르게 합니다.',
    install: 'npx skills add vercel-labs/agent-skills',
    kind: 'domain',
    appliesTo: () => null,
  },
  {
    id: 'react-native-skills',
    name: 'react-native-skills',
    repo: 'vercel-labs/agent-skills',
    what: 'React Native 앱의 화면·목록·애니메이션 성능 권장 규칙을 따르게 합니다.',
    install: 'npx skills add vercel-labs/agent-skills',
    kind: 'domain',
    appliesTo: (p) => (p.platform === 'mobile' ? '모바일 앱은 목록·애니메이션 성능 문제가 늦게 드러남' : null),
  },
  {
    id: 'open-sourcing',
    name: 'open-sourcing',
    repo: 'trailofbits/skills',
    what: '공개 전에 비밀 정보 제거, 라이선스, README·기여 가이드를 준비하게 합니다.',
    install: '/plugin marketplace add trailofbits/skills',
    kind: 'domain',
    appliesTo: () => null,
  },
  {
    id: 'writing-plans',
    name: 'writing-plans',
    repo: 'obra/superpowers',
    what: '큰 작업을 바로 짜지 않고 단계별 계획을 먼저 세우고 그 순서대로 진행하게 합니다.',
    install: '/plugin marketplace add obra/superpowers',
    kind: 'general',
    appliesTo: () => null,
  },
  {
    id: 'engineering-guardrails',
    name: 'engineering-guardrails',
    repo: 'difficcd/skills-workshop',
    what: '중복 로직·조용한 실패·거대 파일처럼 대규모 리팩토링을 부르는 패턴을 막습니다.',
    install: 'skills/engineering-guardrails 폴더를 ~/.claude/skills/ 로 복사',
    kind: 'general',
    appliesTo: (p) => (p.stage === 'production' && p.users === 'multi' ? '여러 사용자가 오래 쓸 프로젝트라 구조 부채가 쌓이기 쉬움' : null),
  },
  {
    id: 'ask-first',
    name: 'ask-first',
    repo: 'difficcd/skills-workshop',
    what: '요청이 두 가지 이상으로 읽히면 만들기 전에 질문하게 합니다.',
    install: 'skills/ask-first 폴더를 ~/.claude/skills/ 로 복사',
    kind: 'general',
    appliesTo: (p) => (p.users === 'multi' ? '여러 사람이 쓰는 앱은 개발 중에 새 갈림길이 계속 나옴' : null),
  },
];

export const MAX_SKILLS = 4;

export interface ShownSkill {
  skill: SkillRec;
  reason: string;
  /** 'ai' when the model picked it for this project, 'rule' when the profile alone calls for it. */
  by: 'ai' | 'rule';
}

/**
 * The AI's picks plus any domain skill the profile clearly calls for that the AI left out (it
 * leans on general process skills), domain ones first, capped. An AI pick without a reason shows
 * the rule's reason when there is one, so a line is never just the catalog blurb when more is known.
 */
export function mergeSkills(picks: { id: string; reason: string }[], profile: Profile): ShownSkill[] {
  const out: ShownSkill[] = [];
  for (const p of picks) {
    const skill = SKILLS.find((s) => s.id === p.id);
    if (skill) out.push({ skill, reason: p.reason || skill.appliesTo(profile) || skill.what, by: 'ai' });
  }
  for (const skill of SKILLS) {
    if (skill.kind !== 'domain' || out.some((o) => o.skill.id === skill.id)) continue;
    const reason = skill.appliesTo(profile);
    if (reason) out.push({ skill, reason, by: 'rule' });
  }
  const rank = (s: ShownSkill) => (s.skill.kind === 'domain' ? 0 : 1);
  return out.map((s, i) => ({ s, i })).sort((a, b) => rank(a.s) - rank(b.s) || a.i - b.i).map(({ s }) => s).slice(0, MAX_SKILLS);
}
const MAX_PER_REPO = 2;

/**
 * Applicable skills, domain ones first, capped so no single source dominates the list. The general
 * ones apply to nearly every project, so in catalog order they took every slot and the list read
 * the same for every app (user feedback, #27).
 */
export function recommendSkills(profile: Profile): { skill: SkillRec; reason: string }[] {
  const perRepo = new Map<string, number>();
  const out: { skill: SkillRec; reason: string }[] = [];
  const ordered = [...SKILLS.filter((s) => s.kind === 'domain'), ...SKILLS.filter((s) => s.kind === 'general')];
  for (const skill of ordered) {
    if (out.length === MAX_SKILLS) break;
    const reason = skill.appliesTo(profile);
    const used = perRepo.get(skill.repo) ?? 0;
    if (!reason || used === MAX_PER_REPO) continue;
    perRepo.set(skill.repo, used + 1);
    out.push({ skill, reason });
  }
  return out;
}
