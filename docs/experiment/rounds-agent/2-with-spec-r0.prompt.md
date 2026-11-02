# Project instructions

## Goal
스터디 모임 출석체크랑 벌금 정산해주는 웹사이트

스터디 모임의 출석 관리와 벌금 정산을 자동화하는 웹사이트 개발 요청입니다.

## Decisions already made
These were decided by the owner. Do not change them; ask if one blocks you.
- 지각과 결석의 기준 및 벌금 산정 방식은 어떻게 되나요? → **고정 금액제**
- 벌금 수정 및 면제 권한은 누가 가지나요? → **방장(모임장)만 수정 가능**
- 모임 내 다수 그룹(스터디) 관리는 어떻게 지원하나요? → **1인 1개 모임 생성**
- 어디서 접속하며, 로그인 방식은 어떻게 할까요? → **웹 사이트 + 간편 소셜 로그인**
- 출석 및 벌금 데이터는 어디에 저장할까요? → **서버 데이터베이스 저장**

## Domain rules
Business rules decided by the owner. Implement them exactly and keep them in the business-logic layer, not in UI code.
- 지각은 지정된 금액의 지각비를, 결석은 지정된 금액의 결석비를 일괄 부과한다.
- 방장 권한을 가진 사용자만 출석 기록과 벌금 내역을 수정 및 면제할 수 있다.
- 사용자는 하나의 스터디 모임만 생성하여 관리할 수 있다.

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
- Check on the server, for every request, that the logged-in user may access the requested data. Never rely on hiding buttons in the UI.
- Use parameterized queries only. If using a hosted database (e.g. Supabase, Firebase), enable row-level security or security rules before launch; never ship with open read/write.
- Add rate limiting to login and to any endpoint that calls a paid or quota-limited external API.

## Recommended stack
Use these unless a decision above says otherwise.
- 화면: **Next.js** — 서버 사이드 렌더링과 클라이언트 라우팅을 모두 지원하여 웹사이트 구축에 가장 적합합니다.
- 데이터 저장 및 로그인: **Supabase** — 관계형 데이터베이스, 소셜 로그인 인증, RLS 보안 규칙을 하나의 플랫폼에서 모두 제공합니다.
- 스타일링: **Tailwind CSS** — 빠르고 일관된 디자인의 웹 화면을 구축할 수 있습니다.
- 배포: **Vercel** — Next.js 애플리케이션을 설정 없이 가장 쉽고 안정적으로 무료 배포할 수 있습니다.

## Build plan
Work through these in order. Finish and verify one before starting the next.
1. 프로젝트 초기 설정 및 데이터베이스 스키마 작성 [difficulty: medium]
   - Done when: Supabase 프로젝트가 생성되고, 사용자·모임·출석·벌금 기록을 위한 테이블과 RLS(Row Level Security) 정책이 생성되어 있다.
   - Watch out: 외래키 제약조건 누락
   - Watch out: RLS 정책 설정 누락으로 인한 데이터 노출
2. 소셜 로그인 및 사용자 프로필 연동 구현 [difficulty: medium]
   - Done when: 카카오 또는 구글 간편 소셜 로그인이 정상 작동하며, 로그인 시 users 테이블에 사용자 정보가 자동으로 저장된다.
   - Watch out: 로그인 세션 만료 처리 실패
   - Watch out: users 테이블 동기화 오류
3. 모임 생성 및 참여 기능 구현 [difficulty: easy]
   - Done when: 방장이 모임을 생성할 수 있고, 다른 사용자가 코드를 통해 해당 모임에 참여할 수 있다.
   - Watch out: 중복 참여 방지 누락
   - Watch out: 방장 권한 부여 누락
4. 출석 체크 기능 구현 [difficulty: easy]
   - Done when: 모임 참여자가 출석 체크를 할 수 있으며, 출석 상태(출석, 지각, 결석)가 서버에 기록된다.
   - Watch out: 중복 출석 체크 방지
   - Watch out: 시간대(Timezone) 차이로 인한 날짜 오인
5. 벌금 자동 산정 및 방장 수정 기능 구현 [difficulty: hard]
   - Done when: 지각 및 결석에 따라 고정 금액 벌금이 자동 산정되고, 방장만 벌금 금액을 수정하거나 면제할 수 있다.
   - Watch out: 일반 회원이 API를 직접 호출해 벌금을 임의로 수정하는 보안 취약점
   - Watch out: 금액 계산 오류
6. 모임별 벌금 정산 요약 대시보드 구현 [difficulty: easy]
   - Done when: 모임원별 총 벌금 누적액과 납부 상태를 한눈에 볼 수 있는 대시보드가 표시된다.
   - Watch out: 실시간 데이터 동기화 누락
   - Watch out: 집계 쿼리 성능 저하

## Working style
- If a requirement is ambiguous and not covered above, ask one question instead of guessing.
- Do not add features that are not in the goal or the build plan.
