import type { Rule } from '../types.ts';

// Security rules, each tied to the profile trait that makes it necessary. A rule that
// applies to everything says so; the rest stay off unless the project needs them,
// so the user is not asked to read rules about payments for a to-do app.
export const SECURITY_RULES: Rule[] = [
  {
    id: 'sec-money-integrity',
    category: 'security',
    title: '돈이 걸린 데이터는 기록으로 남기기',
    instructionKo:
      '금액(벌금·잔액·포인트·결제)은 덮어쓰지 말고 변경 내역을 쌓아서 계산한다. 누가 언제 무엇을 바꿨는지 감사 로그를 남긴다. 결제 웹훅은 결제사 이벤트 ID를 저장해 같은 알림이 두 번 와도 한 번만 처리(멱등성)하고, 결제 상태는 서버에서 결제사에 다시 확인한다. 취소·환불은 별도 상태로 다룬다.',
    instruction:
      'Never overwrite an amount (fine, balance, points, payment) in place: record each change as an entry and compute the current value from the entries. Keep an audit log of who changed what and when. Make payment webhooks idempotent by storing the provider event id and ignoring repeats, re-check payment status with the provider on the server, and model cancellation and refund as explicit states.',
    why: '돈은 한 번 어긋나면 되돌리기 어렵습니다. 웹훅이 두 번 오거나 관리자가 금액을 고쳤을 때 이유와 이력이 없으면 분쟁이 납니다.',
    appliesTo: (p) => (p.money === 'yes' ? '돈·벌금·포인트를 계산하거나 주고받음' : null),
  },
  {
    id: 'sec-secrets',
    category: 'security',
    title: '비밀키는 코드에 넣지 않기',
    instructionKo: 'API 키·비밀번호·토큰을 소스 코드에 쓰지 않는다. 환경변수에서 읽고, `.env`는 `.gitignore`에 넣고, 빈 값의 `.env.example`을 커밋한다.',
    instruction:
      'Never write API keys, passwords or tokens in source code. Read them from environment variables, keep `.env` in `.gitignore`, and commit a `.env.example` with empty values.',
    why: 'AI가 편의상 키를 코드에 직접 넣는 일이 잦고, 공개 저장소에 올라가면 바로 도용됩니다.',
    appliesTo: () => '모든 프로젝트에 적용',
  },
  {
    id: 'sec-input-validation',
    category: 'security',
    title: '입력값 검증',
    instructionKo: '모든 사용자 입력은 사용하기 전에 서버에서 검증한다(타입·길이·형식). 브라우저 검증만 믿지 않는다.',
    instruction:
      'Validate every user input on the server side (type, length, format) before using it. Never trust validation done only in the browser.',
    why: '브라우저 검증은 쉽게 우회됩니다. 검증 없는 입력은 대부분의 공격의 출발점입니다.',
    appliesTo: (p) => (p.storage === 'server-db' || p.users === 'multi' ? '서버가 사용자 입력을 받음' : null),
  },
  {
    id: 'sec-password',
    category: 'security',
    title: '비밀번호는 해시로 저장',
    instructionKo: '비밀번호를 평문으로 저장하지 않는다. bcrypt나 argon2로 해시하거나, 검증된 인증 서비스에 맡긴다.',
    instruction:
      'Never store passwords in plain text. Hash them with bcrypt or argon2, or delegate authentication to an established provider.',
    why: '평문 비밀번호는 DB가 한 번 유출되면 사용자 전원의 다른 계정까지 위험해집니다.',
    appliesTo: (p) => (p.auth === 'email' ? '이메일 로그인을 직접 구현함' : null),
  },
  {
    id: 'sec-authz',
    category: 'security',
    title: '권한은 서버에서 확인',
    instructionKo: '요청마다 서버에서 로그인한 사용자가 그 데이터에 접근할 수 있는지 확인한다. UI에서 버튼을 숨기는 것에 의존하지 않는다.',
    instruction:
      'Check on the server, for every request, that the logged-in user may access the requested data. Never rely on hiding buttons in the UI.',
    why: '버튼만 숨기면 주소를 직접 입력해서 남의 데이터를 볼 수 있습니다. 바이브코딩 앱에서 가장 흔한 유출 원인입니다.',
    appliesTo: (p) => (p.auth !== 'none' && p.users === 'multi' ? '여러 사용자가 각자 데이터를 가짐' : null),
  },
  {
    id: 'sec-db-access',
    category: 'security',
    title: 'DB 접근 규칙 설정',
    instructionKo: '파라미터화된 쿼리만 쓴다. 호스팅 DB(Supabase, Firebase 등)는 공개 전에 행 수준 보안이나 보안 규칙을 켠다. 전체 읽기·쓰기 공개 상태로 배포하지 않는다.',
    instruction:
      'Use parameterized queries only. If using a hosted database (e.g. Supabase, Firebase), enable row-level security or security rules before launch; never ship with open read/write.',
    why: '호스팅 DB를 기본 설정(전체 공개)으로 배포해서 데이터가 통째로 노출되는 사고가 반복되고 있습니다.',
    appliesTo: (p) => (p.storage === 'server-db' ? '서버 DB를 씀' : null),
  },
  {
    id: 'sec-upload',
    category: 'security',
    title: '업로드 파일 제한',
    instructionKo: '서버에서 업로드 크기와 허용 파일 형식을 제한하고, 업로드 파일은 웹 루트 밖에 저장하며, 업로드 파일을 실행하거나 HTML로 렌더링하지 않는다.',
    instruction:
      'Limit upload size and allowed file types on the server, store uploads outside the web root, and never execute or render uploaded files as HTML.',
    why: '제한 없는 업로드는 서버 용량 고갈이나 악성 파일 배포로 이어집니다.',
    appliesTo: (p) => (p.upload === 'yes' ? '파일 업로드가 있음' : null),
  },
  {
    id: 'sec-payment',
    category: 'security',
    title: '결제는 검증된 서비스에 맡기기',
    instructionKo: '카드 번호를 직접 다루지 않는다. 결제사의 호스팅 결제창을 쓰고, 결제 완료는 클라이언트가 아니라 결제사 웹훅으로 서버에서 확인한다.',
    instruction:
      'Never handle card numbers directly. Use the payment provider\'s hosted checkout, and confirm payment on the server via the provider\'s webhook, not from the client.',
    why: '클라이언트가 보낸 "결제 완료"를 믿으면 결제 없이 상품을 가져갈 수 있습니다.',
    appliesTo: (p) => (p.payment === 'yes' ? '결제가 있음' : null),
  },
  {
    id: 'sec-rate-limit',
    category: 'security',
    title: '요청 횟수 제한',
    instructionKo: '로그인과, 유료이거나 한도가 있는 외부 API를 호출하는 모든 엔드포인트에 요청 횟수 제한을 건다.',
    instruction:
      'Add rate limiting to login and to any endpoint that calls a paid or quota-limited external API.',
    why: '제한이 없으면 누군가 API를 반복 호출해서 요금 폭탄이나 무료 한도 소진이 일어납니다.',
    appliesTo: (p) =>
      p.scale === 'large'
        ? '트래픽이 많아 한 사용자의 과도한 요청이 전체를 느리게 만들 수 있음'
        : p.externalApi === 'yes'
          ? '외부 API 호출 비용이 사용자 요청에 비례함'
          : p.auth !== 'none'
            ? '로그인 무차별 대입을 막아야 함'
            : null,
  },
  {
    id: 'sec-deps',
    category: 'security',
    title: '의존성 점검',
    instructionKo: '잘 알려지고 유지되는 패키지만 추가한다. 배포 전마다 `npm audit`(또는 플랫폼별 도구)를 실행하고 심각도 높은 문제를 고친다.',
    instruction:
      'Only add well-known, maintained packages. Run `npm audit` (or the platform equivalent) before each release and fix high-severity findings.',
    why: 'AI가 존재하지 않거나 오래된 패키지를 추천하는 경우가 있어, 악성 패키지 설치로 이어질 수 있습니다.',
    appliesTo: (p) => (p.stage === 'production' ? '실제 서비스로 배포함' : null),
  },
];
