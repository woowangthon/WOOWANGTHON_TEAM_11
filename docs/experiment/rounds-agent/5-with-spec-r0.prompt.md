# Project instructions

## Goal
팀 프로젝트 과제 마감일과 역할 분담을 같이 보는 웹앱

팀 프로젝트의 마감일 관리와 역할 분담을 시각적으로 함께 확인하고 조율할 수 있는 웹 기반 협업 도구

## Decisions already made
These were decided by the owner. Do not change them; ask if one blocks you.
- 역할 분담과 마감일 수정 권한은 누가 가질 수 있나요? → **프로젝트 생성자만 수정 가능**
- 작업 상태는 어떻게 구분하고 관리하나요? → **기본 3단계 (할 일, 진행 중, 완료)**
- 마감일이 지난 작업은 어떻게 표시하나요? → **자동으로 지연 표시**
- 사용자 로그인은 어떤 방식으로 구현할까요? → **이메일 회원가입 및 로그인**
- 프로젝트와 역할 데이터는 어디에 저장하나요? → **서버 데이터베이스 사용**

## Domain rules
Business rules decided by the owner. Implement them exactly and keep them in the business-logic layer, not in UI code.
- 프로젝트 생성자만이 역할 할당 및 마감일 변경 권한을 가진다.
- 작업 상태는 할 일, 진행 중, 완료의 3단계로만 관리한다.
- 마감일이 지난 미완료 작업은 지연 상태로 자동 표시한다.

## Engineering rules
- Before writing features, decide where each kind of code lives: business rules (calculations, validation) in modules with no UI or network code, UI in its own folder, external calls in service modules. Follow the framework's conventions for folder names, but keep business rules out of UI components.
- Give each file one responsibility. Treat a file growing past roughly 300 lines as a signal to check whether it mixes responsibilities, and split it if it does. Line count is a prompt to look, not a target: do not split a cohesive file just to get under a number.
- Never copy logic. The second time the same logic is needed, extract it into a shared function and use it from both places.
- Never swallow errors. Every failure must either be shown to the user, logged, or thrown. No empty catch blocks.
- Record every non-obvious design decision in `docs/decisions.md` as one entry: decision, reason, rejected alternative.
- Do not store the same fact in two places, and compute values that can be derived from the source (totals, counts, status labels) instead of storing them. When you do keep a copy on purpose, such as a cache, note which value is the source and when the copy is refreshed.

## Security rules
- Never write API keys, passwords or tokens in source code. Read them from environment variables, keep `.env` in `.gitignore`, and commit a `.env.example` with empty values.
- Validate every user input on the server side (type, length, format) before using it. Never trust validation done only in the browser.
- Never store passwords in plain text. Hash them with bcrypt or argon2, or delegate authentication to an established provider.
- Check on the server, for every request, that the logged-in user may access the requested data. Never rely on hiding buttons in the UI.
- Use parameterized queries only. If using a hosted database (e.g. Supabase, Firebase), enable row-level security or security rules before launch; never ship with open read/write.
- Add rate limiting to login and to any endpoint that calls a paid or quota-limited external API.

## Recommended stack
Use these unless a decision above says otherwise.
- 화면: **Next.js (React)** — 서버 사이드 렌더링과 API 라우트를 동시에 처리할 수 있어 팀 프로젝트 웹앱 구축에 가장 효율적입니다.
- 데이터 저장 및 로그인: **Supabase** — 이메일 로그인과 PostgreSQL 데이터베이스, RLS 보안 규칙을 한 번에 해결할 수 있습니다.
- 스타일링: **Tailwind CSS** — 빠르고 일관성 있게 반응형 UI 컴포넌트를 작성할 수 있습니다.
- 배포: **Vercel** — Next.js 프레임워크와 가장 완벽하게 호환되며 무료로 간편하게 배포할 수 있습니다.

## Build plan
Work through these in order. Finish and verify one before starting the next.
1. 프로젝트 초기 설정 및 데이터베이스 스키마 작성 [difficulty: medium]
   - Done when: Next.js 프로젝트가 생성되고 Supabase에 사용자, 프로젝트, 역할, 작업 테이블이 생성된다.
   - Watch out: 외래 키 제약 조건과 인덱스가 올바르게 설정되었는지 확인해야 합니다.
   - Watch out: RLS(Row Level Security) 정책의 기초를 미리 구상해야 합니다.
2. 이메일 회원가입 및 로그인 기능 구현 [difficulty: medium]
   - Done when: 사용자가 이메일로 회원가입, 로그인, 로그아웃을 할 수 있다.
   - Watch out: 비밀번호가 평문으로 저장되지 않고 Supabase Auth 등을 통해 안전하게 처리되는지 확인해야 합니다.
   - Watch out: 로그인 상태가 페이지 새로고침 시 풀리지 않아야 합니다.
3. 프로젝트 생성 및 프로젝트 생성자 권한 설정 [difficulty: medium]
   - Done when: 로그인한 사용자가 프로젝트를 생성할 수 있으며, 해당 프로젝트의 생성자만 수정 권한을 가진다.
   - Watch out: 프론트엔드에서 버튼을 숨기는 것뿐만 아니라 서버/DB 레벨에서도 생성자만 수정할 수 있도록 제한해야 합니다.
   - Watch out: 잘못된 프로젝트 ID 접근 시 적절한 에러 처리가 필요합니다.
4. 역할 분담 및 작업 관리(3단계 상태) 구현 [difficulty: easy]
   - Done when: 프로젝트 내에서 역할 분담을 지정하고, 작업 상태를 '할 일', '진행 중', '완료' 3단계로 변경할 수 있다.
   - Watch out: 상태 값이 정의된 3가지 외의 값으로 들어오지 않도록 입력값 검증이 필요합니다.
   - Watch out: 작업 상태 변경 시 조용히 실패하지 않고 사용자에게 피드백을 주어야 합니다.
5. 마감일 자동 지연 표시 기능 구현 [difficulty: easy]
   - Done when: 마감일이 지난 작업은 '완료' 상태가 아닐 경우 자동으로 지연 상태로 표시된다.
   - Watch out: 클라이언트와 서버 간의 시간대(Timezone) 차이로 인한 오류를 방지해야 합니다.
   - Watch out: 완료된 작업은 마감일이 지나도 지연으로 표시되지 않아야 합니다.

## Working style
- If a requirement is ambiguous and not covered above, ask one question instead of guessing.
- Do not add features that are not in the goal or the build plan.
