# Project instructions

## Goal
헬스장 PT 예약하고 회원권 남은 횟수를 관리하는 앱

헬스장 PT 예약 및 잔여 회원권 횟수 관리 앱

## Decisions already made
These were decided by the owner. Do not change them; ask if one blocks you.
- 예약 취소 및 노쇼(No-show) 시 횟수 차감 기준을 어떻게 정할까요? → **당일 취소는 횟수 차감, 전날 취소는 미차감**
- 회원권 횟수가 모두 소진되었을 때 추가 예약을 허용할까요? → **잔여 횟수가 0이면 예약 불가**
- 하나의 회원권으로 여러 명이 함께 수업을 들을 수 있나요? → **1대1 개인 PT 전용**
- 어떤 플랫폼에서 앱을 실행할 예정인가요? → **모바일 웹 브라우저**
- 회원 정보와 예약 데이터는 어디에 저장할까요? → **클라우드 데이터베이스 (서버 저장)**

## Domain rules
Business rules decided by the owner. Implement them exactly and keep them in the business-logic layer, not in UI code.
- 수업 전날까지의 취소는 횟수를 차감하지 않고, 당일 취소 또는 노쇼는 회원권 횟수를 1회 차감한다.
- 남은 PT 횟수가 0인 회원은 새로운 예약을 생성할 수 없다.
- 하나의 예약 슬롯에는 정확히 1명의 회원만 매핑된다.

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
- 화면: **Next.js (React)** — 모바일 웹 브라우저 환경에서 동작하는 반응형 UI를 빠르게 구축할 수 있습니다.
- 데이터 저장 및 로그인: **Supabase** — 클라우드 데이터베이스와 사용자 인증, RLS 보안 설정을 한 번에 해결할 수 있습니다.
- 배포: **Vercel** — Next.js 앱을 별도의 서버 설정 없이 무료로 빠르게 배포할 수 있습니다.

## Build plan
Work through these in order. Finish and verify one before starting the next.
1. 데이터베이스 스키마 및 회원가입·로그인 API 구축 [difficulty: medium]
   - Done when: 회원, 회원권, 예약 테이블이 생성되어 있고 사용자가 회원가입 및 로그인하여 JWT 토큰을 발급받을 수 있다.
   - Watch out: 비밀번호는 평문으로 저장하지 않고 반드시 해시 처리해야 합니다.
   - Watch out: DB 접근 규칙(RLS)을 설정하여 다른 사용자의 데이터에 접근할 수 없도록 해야 합니다.
2. 회원권 잔여 횟수 관리 및 검증 로직 구현 [difficulty: easy]
   - Done when: 회원의 현재 잔여 횟수가 조회되며, 0회일 경우 예약 생성 요청이 거부된다.
   - Watch out: 잔여 횟수가 0일 때 클라이언트와 서버 양쪽에서 예약을 막아야 합니다.
   - Watch out: 동시 요청으로 인한 마이너스 횟수 차감 가능성을 방지해야 합니다.
3. PT 예약 생성 및 취소 정책(당일/전날) 구현 [difficulty: medium]
   - Done when: 예약 생성 기능과 함께 전날 취소는 횟수가 복구되고 당일 취소는 횟수가 차감되는 취소 기능이 동작한다.
   - Watch out: 서버 시간 기준으로 당일과 전날을 정확히 판별해야 합니다.
   - Watch out: 이미 지난 예약이나 존재하지 않는 예약에 대한 예외 처리가 필요합니다.
4. 모바일 웹 예약 캘린더 및 마이페이지 화면 구현 [difficulty: easy]
   - Done when: 모바일 웹 브라우저에서 캘린더를 통해 예약을 생성하고, 내 예약 목록과 잔여 횟수를 확인할 수 있다.
   - Watch out: 모바일 화면에서 터치와 레이아웃이 깨지지 않도록 반응형으로 작성해야 합니다.
   - Watch out: API 호출 실패 시 사용자에게 조용히 실패하지 않고 안내 메시지를 띄워야 합니다.

## Working style
- If a requirement is ambiguous and not covered above, ask one question instead of guessing.
- Do not add features that are not in the goal or the build plan.
