import type { Rule } from '../types.ts';

// Software-engineering rules for the coding agent. Each one exists because vibe-coded
// projects reliably break the same way without it; `why` says how, in user terms.
export const ENGINEERING_RULES: Rule[] = [
  {
    id: 'eng-structure',
    category: 'engineering',
    title: '폴더 구조를 먼저 정하고 지키기',
    instruction:
      'Before writing features, create the folder layout below and keep to it: pure logic in `src/core/` (no UI, no network), UI in `src/ui/`, external calls in `src/services/`. Do not put business logic inside UI components.',
    why: '구조 없이 시작하면 기능이 한 파일에 쌓여서, 나중에 고칠 때 AI가 전체를 다시 읽느라 토큰을 씁니다.',
    appliesTo: () => '모든 프로젝트에 적용',
  },
  {
    id: 'eng-file-size',
    category: 'engineering',
    title: '파일 하나는 300줄 이하',
    instruction:
      'Keep every source file under 300 lines. When a file approaches the limit, split it by responsibility before adding more.',
    why: '긴 파일은 수정할 때마다 통째로 다시 읽혀서 토큰이 새고, 스파게티 코드의 출발점이 됩니다.',
    appliesTo: () => '모든 프로젝트에 적용',
  },
  {
    id: 'eng-no-duplication',
    category: 'engineering',
    title: '같은 로직을 두 번 쓰지 않기',
    instruction:
      'Never copy logic. The second time the same logic is needed, extract it into a shared function and use it from both places.',
    why: 'AI는 기존 함수를 찾기보다 새로 쓰는 경향이 있어서, 복사본끼리 어긋나는 버그가 생깁니다.',
    appliesTo: () => '모든 프로젝트에 적용',
  },
  {
    id: 'eng-no-silent-failure',
    category: 'engineering',
    title: '조용히 실패하지 않기',
    instruction:
      'Never swallow errors. Every failure must either be shown to the user, logged, or thrown. No empty catch blocks.',
    why: '빈 catch는 "동작하는 것처럼 보이지만 아무 일도 안 일어나는" 버그를 만들고, 원인을 찾느라 대화가 길어집니다.',
    appliesTo: () => '모든 프로젝트에 적용',
  },
  {
    id: 'eng-tests-core',
    category: 'engineering',
    title: '핵심 로직에 테스트',
    instruction:
      'Write unit tests for everything in `src/core/`. Run them after every change and do not report a task done while a test fails.',
    why: '테스트가 없으면 AI가 기능을 고치다 다른 기능을 깨뜨려도 알 수 없습니다.',
    appliesTo: (p) => (p.stage === 'production' ? '실제 서비스 단계라 회귀를 막아야 함' : null),
  },
  {
    id: 'eng-decisions-log',
    category: 'engineering',
    title: '결정 기록 남기기',
    instruction:
      'Record every non-obvious design decision in `docs/decisions.md` as one entry: decision, reason, rejected alternative.',
    why: '왜 이렇게 만들었는지가 남아 있지 않으면, 다음 대화에서 AI가 같은 고민을 반복하거나 결정을 뒤집습니다.',
    appliesTo: (p) => (p.users === 'multi' || p.stage === 'production' ? '여러 사람·오래 유지할 프로젝트' : null),
  },
  {
    id: 'eng-single-source',
    category: 'engineering',
    title: '데이터는 한 곳에만 저장',
    instruction:
      'Store each piece of state in exactly one place and derive everything else from it. Never keep a copy that must be updated in sync.',
    why: '같은 값을 두 곳에 두면 한쪽만 바뀌는 순간 화면과 데이터가 어긋납니다.',
    appliesTo: (p) => (p.storage !== 'none' ? '데이터를 저장하는 앱' : null),
  },
  {
    id: 'eng-api-boundary',
    category: 'engineering',
    title: '외부 API는 한 모듈로 감싸기',
    instruction:
      'Wrap every external API in one module under `src/services/` with typed inputs and outputs. The rest of the code never calls the API directly.',
    why: 'API가 바뀌거나 막혔을 때 한 파일만 고치면 됩니다.',
    appliesTo: (p) => (p.externalApi === 'yes' || p.payment === 'yes' ? '외부 서비스를 호출함' : null),
  },
];
