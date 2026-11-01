import type { Profile } from './types.ts';

export interface SkillRec {
  id: string;
  name: string;
  /** GitHub owner/repo; every entry was checked to exist when added. */
  repo: string;
  what: string;
  install: string;
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
    appliesTo: () => '"다 됐어요" 하고 안 돌아가는 코드를 받는 일이 다시 묻는 왕복의 가장 흔한 원인',
  },
  {
    id: 'ponytail',
    name: 'ponytail',
    repo: 'DietrichGebert/ponytail',
    what: '새 코드를 쓰기 전에 기존 코드·표준 라이브러리를 먼저 쓰게 해 코드와 토큰을 줄입니다.',
    install: '/plugin marketplace add DietrichGebert/ponytail',
    appliesTo: () => '수정 단계에서 코드와 토큰을 줄임 (독립 테스트에서 작업당 약 10%)',
  },
  {
    id: 'frontend-design',
    name: 'frontend-design',
    repo: 'anthropics/skills',
    what: '화면을 만들 때 일관된 디자인 원칙을 따르게 합니다.',
    install: '/plugin marketplace add anthropics/skills',
    appliesTo: (p) => (p.platform === 'web' || p.platform === 'mobile' ? '화면이 있는 앱이라 디자인이 들쭉날쭉해지기 쉬움' : null),
  },
  {
    id: 'tdd',
    name: 'test-driven-development',
    repo: 'obra/superpowers',
    what: '기능보다 테스트를 먼저 쓰게 해서, 고치다 다른 기능을 깨뜨리는 일을 막습니다.',
    install: '/plugin marketplace add obra/superpowers',
    appliesTo: (p) => (p.stage === 'production' ? '실제 서비스로 공개할 예정이라 회귀를 막아야 함' : null),
  },
  {
    id: 'webapp-testing',
    name: 'webapp-testing',
    repo: 'anthropics/skills',
    what: '브라우저로 웹앱을 직접 띄워 동작을 확인하게 합니다.',
    install: '/plugin marketplace add anthropics/skills',
    appliesTo: (p) => (p.platform === 'web' && p.stage === 'production' ? '공개할 웹앱이라 실제 화면 동작 확인이 필요함' : null),
  },
  {
    id: 'systematic-debugging',
    name: 'systematic-debugging',
    repo: 'obra/superpowers',
    what: '버그를 추측으로 고치지 않고 원인을 좁혀 가며 찾게 합니다.',
    install: '/plugin marketplace add obra/superpowers',
    appliesTo: (p) =>
      p.storage === 'server-db' || p.externalApi === 'yes' ? '서버·외부 서비스 연동은 원인 모를 오류가 잦음' : null,
  },
  {
    id: 'engineering-guardrails',
    name: 'engineering-guardrails',
    repo: 'difficcd/skills-workshop',
    what: '중복 로직·조용한 실패·거대 파일처럼 대규모 리팩토링을 부르는 패턴을 막습니다.',
    install: 'skills/engineering-guardrails 폴더를 ~/.claude/skills/ 로 복사',
    appliesTo: (p) => (p.stage === 'production' && p.users === 'multi' ? '여러 사용자가 오래 쓸 프로젝트라 구조 부채가 쌓이기 쉬움' : null),
  },
  {
    id: 'ask-first',
    name: 'ask-first',
    repo: 'difficcd/skills-workshop',
    what: '요청이 두 가지 이상으로 읽히면 만들기 전에 질문하게 합니다.',
    install: 'skills/ask-first 폴더를 ~/.claude/skills/ 로 복사',
    appliesTo: (p) => (p.users === 'multi' ? '여러 사람이 쓰는 앱은 개발 중에 새 갈림길이 계속 나옴' : null),
  },
];

export const MAX_SKILLS = 4;
const MAX_PER_REPO = 2;

/** Applicable skills in priority order, capped so no single source dominates the list. */
export function recommendSkills(profile: Profile): { skill: SkillRec; reason: string }[] {
  const perRepo = new Map<string, number>();
  const out: { skill: SkillRec; reason: string }[] = [];
  for (const skill of SKILLS) {
    if (out.length === MAX_SKILLS) break;
    const reason = skill.appliesTo(profile);
    const used = perRepo.get(skill.repo) ?? 0;
    if (!reason || used === MAX_PER_REPO) continue;
    perRepo.set(skill.repo, used + 1);
    out.push({ skill, reason });
  }
  return out;
}
