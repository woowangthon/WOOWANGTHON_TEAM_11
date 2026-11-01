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
// start, a skill keeps steering the agent on every turn.
export const SKILLS: SkillRec[] = [
  {
    id: 'ask-first',
    name: 'ask-first',
    repo: 'difficcd/skills-workshop',
    what: '요청이 두 가지 이상으로 읽히면 만들기 전에 질문하게 합니다.',
    install: 'skills/ask-first 폴더를 ~/.claude/skills/ 로 복사',
    appliesTo: () => '사양서에 없는 갈림길이 개발 중에 또 나오므로, 추측 대신 질문하게 해 재작업을 줄임',
  },
  {
    id: 'ponytail',
    name: 'ponytail',
    repo: 'DietrichGebert/ponytail',
    what: '새 코드를 쓰기 전에 기존 코드·표준 라이브러리를 먼저 쓰게 해 코드와 토큰을 줄입니다.',
    install: '/plugin marketplace add DietrichGebert/ponytail',
    appliesTo: (p) => (p.stage === 'production' ? '기능을 계속 덧붙일 프로젝트라 수정 단계의 토큰 절감 효과가 큼' : null),
  },
  {
    id: 'engineering-guardrails',
    name: 'engineering-guardrails',
    repo: 'difficcd/skills-workshop',
    what: '중복 로직·조용한 실패·거대 파일처럼 대규모 리팩토링을 부르는 패턴을 막습니다.',
    install: 'skills/engineering-guardrails 폴더를 ~/.claude/skills/ 로 복사',
    appliesTo: (p) => (p.stage === 'production' || p.users === 'multi' ? '오래 유지할 프로젝트라 구조 부채가 쌓이기 쉬움' : null),
  },
  {
    id: 'tdd',
    name: 'test-driven-development (superpowers)',
    repo: 'obra/superpowers',
    what: '기능보다 테스트를 먼저 쓰게 해서, 고치다 다른 기능을 깨뜨리는 일을 막습니다.',
    install: '/plugin marketplace add obra/superpowers',
    appliesTo: (p) => (p.stage === 'production' ? '실제 서비스로 공개할 예정이라 회귀를 막아야 함' : null),
  },
  {
    id: 'frontend-design',
    name: 'frontend-design (Anthropic)',
    repo: 'anthropics/skills',
    what: '화면을 만들 때 일관된 디자인 원칙을 따르게 합니다.',
    install: '/plugin marketplace add anthropics/skills',
    appliesTo: (p) => (p.platform === 'web' || p.platform === 'mobile' ? '화면이 있는 앱이라 디자인이 들쭉날쭉해지기 쉬움' : null),
  },
  {
    id: 'webapp-testing',
    name: 'webapp-testing (Anthropic)',
    repo: 'anthropics/skills',
    what: '브라우저로 웹앱을 직접 띄워 동작을 확인하게 합니다.',
    install: '/plugin marketplace add anthropics/skills',
    appliesTo: (p) => (p.platform === 'web' && p.stage === 'production' ? '공개할 웹앱이라 실제 화면 동작 확인이 필요함' : null),
  },
];

export function recommendSkills(profile: Profile): { skill: SkillRec; reason: string }[] {
  return SKILLS.flatMap((skill) => {
    const reason = skill.appliesTo(profile);
    return reason ? [{ skill, reason }] : [];
  });
}
