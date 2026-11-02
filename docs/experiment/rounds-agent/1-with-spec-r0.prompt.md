# Project instructions

## Goal
동아리 회비 관리 앱. 회원별 납부 여부를 보고 미납자에게 알림을 보내고 싶어

동아리 회비 납부 여부 확인 및 미납자 알림 발송 앱

## Decisions already made
These were decided by the owner. Do not change them; ask if one blocks you.
- 회비 미납 알림은 어떤 방식으로 발송할까요? → **앱 내 수동 확인 및 복사**
- 회비 납부 확인과 처리 방식은 어떻게 할까요? → **운영진 수동 체크**
- 회비 금액과 납부 기한은 어떻게 설정하나요? → **전체 일괄 적용**
- 어디서 접속해서 사용하는 앱인가요? → **모바일 웹 / 스마트폰 웹사이트**
- 로그인과 회원 관리는 어떻게 시작할까요? → **간단한 이메일/비밀번호 로그인**

## Domain rules
Business rules decided by the owner. Implement them exactly and keep them in the business-logic layer, not in UI code.
- 미납자 명단만 화면에 제공하고 알림은 운영진이 외부 메신저로 직접 발송한다.
- 운영진이 입금 내역을 확인하고 수동으로 회원의 납부 상태를 갱신한다.
- 모든 회원에게 동일한 회비 금액과 납부 기한을 일괄 적용한다.

## Engineering rules
- Before writing features, decide where each kind of code lives: business rules (calculations, validation) in modules with no UI or network code, UI in its own folder, external calls in service modules. Follow the framework's conventions for folder names, but keep business rules out of UI components.
- Give each file one responsibility. Treat a file growing past roughly 300 lines as a signal to check whether it mixes responsibilities, and split it if it does. Line count is a prompt to look, not a target: do not split a cohesive file just to get under a number.
- Never copy logic. The second time the same logic is needed, extract it into a shared function and use it from both places.
- Never swallow errors. Every failure must either be shown to the user, logged, or thrown. No empty catch blocks.
- Record every non-obvious design decision in `docs/decisions.md` as one entry: decision, reason, rejected alternative.
- Do not store the same fact in two places, and compute values that can be derived from the source (totals, counts, status labels) instead of storing them. When you do keep a copy on purpose, such as a cache, note which value is the source and when the copy is refreshed.

## Security rules
- Never overwrite an amount (fine, balance, points, payment) in place: record each change as an entry and compute the current value from the entries. Keep an audit log of who changed what and when. Make payment webhooks idempotent by storing the provider event id and ignoring repeats, re-check payment status with the provider on the server, and model cancellation and refund as explicit states.
- Never write API keys, passwords or tokens in source code. Read them from environment variables, keep `.env` in `.gitignore`, and commit a `.env.example` with empty values.
- Validate every user input on the server side (type, length, format) before using it. Never trust validation done only in the browser.
- Never store passwords in plain text. Hash them with bcrypt or argon2, or delegate authentication to an established provider.
- Check on the server, for every request, that the logged-in user may access the requested data. Never rely on hiding buttons in the UI.
- Add rate limiting to login and to any endpoint that calls a paid or quota-limited external API.

## Recommended stack
Use these unless a decision above says otherwise.
- 화면: **Next.js (React)** — 모바일 웹사이트에 적합한 반응형 UI를 빠르게 만들 수 있고 서버와 클라이언트 로직을 함께 관리하기 좋습니다.
- 데이터 저장 및 로그인: **Supabase** — 이메일 로그인, 데이터베이스, 서버 권한(RLS) 설정을 하나의 플랫폼에서 무료로 제공합니다.
- 배포: **Vercel** — Next.js 프로젝트를 설정 없이 간편하게 무료로 배포하고 운영할 수 있습니다.

## Build plan
Work through these in order. Finish and verify one before starting the next.
1. 데이터베이스 및 인증 기본 구조 구축 [difficulty: medium]
   - Done when: 회원 데이터와 회비 납부 기록을 저장할 테이블을 만들고 이메일 로그인과 역할(운영진/일반회원) 권한 확인이 동작합니다.
   - Watch out: 비밀번호가 평문으로 저장되지 않고 해시 처리되는지 확인
   - Watch out: 일반 회원이 운영진 권한이 필요한 API에 접근할 수 없는지 확인
2. 일괄 회비 설정 및 납부 현황 화면 구현 [difficulty: easy]
   - Done when: 운영진이 전체 회비 금액과 납부 기한을 일괄 설정할 수 있고, 모든 회원의 납부 여부 목록을 조회할 수 있습니다.
   - Watch out: 금액 입력 시 음수나 잘못된 형식의 입력값이 들어오지 않도록 검증
   - Watch out: 기존 설정이 있을 때 일괄 갱신이 올바르게 동작하는지 확인
3. 운영진 수동 납부 체크 기능 구현 [difficulty: medium]
   - Done when: 운영진 계정으로 로그인하여 각 회원의 납부 상태를 체크/해제할 수 있으며 변경 이력이 기록됩니다.
   - Watch out: 일반 회원이 임의로 다른 회원의 납부 상태를 변경하지 못하도록 서버 권한 확인 적용
   - Watch out: 돈이 걸린 데이터이므로 변경 기록이 누락되지 않는지 확인
4. 미납자 알림 텍스트 생성 및 복사 기능 구현 [difficulty: easy]
   - Done when: 미납자 목록을 기준으로 독촉 메시지 텍스트가 자동으로 생성되고, 클립보드 복사 버튼을 통해 쉽게 복사할 수 있습니다.
   - Watch out: 미납자 목록이 비어있을 때의 예외 처리
   - Watch out: 모바일 웹 브라우저 환경에서 클립보드 복사가 정상 작동하는지 확인

## Working style
- If a requirement is ambiguous and not covered above, ask one question instead of guessing.
- Do not add features that are not in the goal or the build plan.
