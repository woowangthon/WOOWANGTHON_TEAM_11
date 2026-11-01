import type { Profile } from './types.ts';

export interface SecurityCheckRule {
  id: string;
  what: string;
  /** Steps a non-developer can follow. Fixed text, not model output, so it can be trusted. */
  steps: string[];
  appliesTo: (p: Profile) => boolean;
}

// Security checks a person must do because an AI agent's own "it's secure" cannot be taken
// on trust. Rule-based on purpose, and security only: ordinary "does the feature work" checks
// belong to the task's done condition, not here.
export const SECURITY_CHECKS: SecurityCheckRule[] = [
  {
    id: 'env-committed',
    what: 'API 키가 담긴 .env 파일이 GitHub에 올라가지 않았는지',
    steps: [
      'GitHub 저장소 첫 화면의 파일 목록에 .env 파일이 보이면 키가 공개된 것입니다 (.env.example은 괜찮음).',
      '저장소 위쪽 검색창에서 키 앞부분을 검색합니다. 예: Gemini는 AIza, OpenAI는 sk-, Anthropic은 sk-ant-',
      '.gitignore 파일을 열어 .env 줄이 있는지 확인합니다. 없으면 AI가 무시 설정 없이 올린 것입니다.',
      '한 번이라도 올라갔다면 파일을 지워도 커밋 기록에 남습니다. 발급처에서 키를 폐기하고 새로 발급하세요.',
    ],
    appliesTo: (p) => p.externalApi === 'yes' || p.payment === 'yes' || p.storage === 'server-db' || p.auth !== 'none',
  },
  {
    id: 'key-in-browser',
    what: '배포된 사이트에서 키가 브라우저로 새어 나오지 않는지',
    steps: [
      '배포된 사이트를 열고 F12 → Network 탭을 켠 채 기능을 한 번 씁니다.',
      '요청 목록을 눌러 주소·헤더·응답에 키 앞부분이 보이는지 확인합니다. 보이면 키가 사용자에게 노출된 것입니다.',
      'F12 → Sources 탭에서 Ctrl+Shift+F로 키 앞부분을 검색합니다. 자바스크립트 파일 안에 있으면 노출입니다.',
      '키는 서버(백엔드·서버리스 함수)에만 있어야 합니다. 노출됐다면 "키를 서버로 옮겨 달라"고 요청하고 키를 재발급하세요.',
    ],
    appliesTo: (p) => p.externalApi === 'yes' || p.payment === 'yes',
  },
  {
    id: 'other-account',
    what: '내 정보·데이터를 다른 사람이 볼 수 없는지',
    steps: [
      '계정 두 개를 만들고 A로 데이터를 만든 뒤, B로 로그인해 그 데이터가 보이는지 확인합니다.',
      'A로 데이터를 열었을 때의 주소(예: /items/12)를 복사해, B로 로그인한 상태에서 붙여넣어 엽니다. 열리면 권한 검사가 빠진 것입니다.',
      '주소의 숫자를 11, 13처럼 바꿔 봅니다. 남의 데이터가 보이면 같은 문제입니다.',
    ],
    appliesTo: (p) => p.auth !== 'none' || p.users === 'multi',
  },
  {
    id: 'db-open',
    what: '데이터베이스가 아무나 읽고 쓸 수 있게 열려 있지 않은지',
    steps: [
      '호스팅 DB 대시보드(예: Supabase → Authentication → Policies)에서 모든 테이블에 접근 규칙(RLS)이 켜져 있는지 봅니다. 꺼진 테이블이 있으면 위험합니다.',
      '로그아웃한 상태(또는 시크릿 창)에서 데이터가 조회되는지 확인합니다.',
    ],
    appliesTo: (p) => p.storage === 'server-db',
  },
  {
    id: 'error-leak',
    what: '오류 화면에 내부 정보가 드러나지 않는지',
    steps: [
      '없는 주소(예: /asdf)나 잘못된 입력(아주 긴 글, 특수문자)으로 일부러 오류를 냅니다.',
      '화면이나 F12 → Network 응답에 코드 경로, DB 주소, 키, 긴 오류 기록(stack trace)이 보이면 정보가 새는 것입니다.',
    ],
    appliesTo: (p) => p.storage === 'server-db' || p.externalApi === 'yes',
  },
  {
    id: 'payment-bypass',
    what: '결제하지 않고 상품을 받을 수 없는지',
    steps: [
      '테스트 모드에서 결제창을 띄웠다가 취소하고, 상품이 지급되지 않는지 확인합니다.',
      '결제 완료가 결제사 웹훅(서버 간 알림)으로만 처리되는지 AI에게 코드 위치와 함께 설명해 달라고 요청합니다.',
    ],
    appliesTo: (p) => p.payment === 'yes',
  },
  {
    id: 'fake-package',
    what: 'AI가 추가한 패키지가 실제로 존재하는 정상 패키지인지',
    steps: [
      'package.json에 새로 생긴 패키지 이름을 npmjs.com에서 검색해 주간 다운로드 수와 최근 업데이트를 봅니다.',
      '처음 보는 이름이고 다운로드가 거의 없으면 악성 패키지일 수 있습니다. 설치하기 전에 다시 물어보세요.',
    ],
    appliesTo: (p) => p.stage === 'production',
  },
];

export function securityChecksFor(profile: Profile): SecurityCheckRule[] {
  return SECURITY_CHECKS.filter((c) => c.appliesTo(profile));
}
