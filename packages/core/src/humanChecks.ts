import type { Profile } from './types.ts';

export interface HumanCheckRule {
  id: string;
  what: string;
  /** Steps a non-developer can follow. Fixed text, not model output, so it can be trusted. */
  steps: string[];
  appliesTo: (p: Profile) => boolean;
}

// What a person must verify because an AI agent's own "done, it's secure" cannot be taken
// on trust. Rule-based on purpose: these are the checks that must not depend on the model.
export const HUMAN_CHECKS: HumanCheckRule[] = [
  {
    id: 'run-it-yourself',
    what: 'AI가 "완료"라고 한 기능을 직접 실행해 보기',
    steps: [
      '작업 계획의 완료 조건을 하나씩 직접 눌러서 확인합니다.',
      '안 되면 "완료라고 했는데 X가 안 된다"고 구체적으로 다시 요청합니다.',
    ],
    appliesTo: () => true,
  },
  {
    id: 'secret-leak',
    what: 'API 키·비밀번호가 코드나 화면에 노출되지 않았는지',
    steps: [
      '저장소에서 키 일부(앞 6글자 등)로 검색합니다: GitHub 저장소 상단 검색창 또는 `git log -p | findstr 키앞부분`',
      '배포된 사이트에서 F12 → Network 탭을 열고 기능을 써 본 뒤, 요청 주소·헤더·응답에 키가 보이는지 확인합니다.',
      'F12 → Sources 탭에서 자바스크립트 파일을 Ctrl+F로 키 앞부분 검색합니다. 보이면 노출된 것입니다.',
      'GitHub 저장소 Settings → Security → Secret scanning 알림을 켜 둡니다.',
      '한 번이라도 노출됐다면 지우는 것으로 끝나지 않습니다. 발급처에서 키를 폐기하고 새로 발급하세요.',
    ],
    appliesTo: (p) => p.externalApi === 'yes' || p.payment === 'yes',
  },
  {
    id: 'other-account',
    what: '다른 계정으로 내 데이터를 볼 수 없는지',
    steps: [
      '계정 두 개를 만들고 A로 데이터를 만든 뒤, B로 로그인해 그 데이터가 보이는지 확인합니다.',
      'A의 데이터 주소(예: /items/12)를 복사해 B로 로그인한 상태에서 직접 열어 봅니다. 열리면 권한 검사가 빠진 것입니다.',
    ],
    appliesTo: (p) => p.auth !== 'none',
  },
  {
    id: 'db-open',
    what: '데이터베이스가 아무나 읽고 쓸 수 있게 열려 있지 않은지',
    steps: [
      '호스팅 DB 대시보드(예: Supabase → Authentication → Policies)에서 모든 테이블에 접근 규칙(RLS)이 켜져 있는지 봅니다.',
      '로그아웃한 상태에서 데이터가 조회되는지 확인합니다.',
    ],
    appliesTo: (p) => p.storage === 'server-db',
  },
  {
    id: 'payment-bypass',
    what: '결제하지 않고 상품을 받을 수 없는지',
    steps: [
      '테스트 모드에서 결제창을 띄웠다가 취소하고, 상품이 지급되지 않는지 확인합니다.',
      '결제 완료는 결제사 웹훅으로만 처리되는지 개발 요청 기록이나 코드에서 확인을 요청합니다.',
    ],
    appliesTo: (p) => p.payment === 'yes',
  },
  {
    id: 'fake-package',
    what: 'AI가 추가한 패키지가 실제로 존재하는 정상 패키지인지',
    steps: [
      'package.json에 새로 생긴 패키지 이름을 npmjs.com에서 검색해 주간 다운로드 수와 최근 업데이트를 봅니다.',
      '처음 보는 이름이고 다운로드가 거의 없으면 설치하기 전에 다시 물어봅니다.',
    ],
    appliesTo: (p) => p.stage === 'production',
  },
];

export function humanChecksFor(profile: Profile): HumanCheckRule[] {
  return HUMAN_CHECKS.filter((c) => c.appliesTo(profile));
}
