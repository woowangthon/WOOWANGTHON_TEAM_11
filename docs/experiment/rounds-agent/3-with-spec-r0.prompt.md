# Project instructions

## Goal
우리 학교 학생끼리 중고 교재 사고파는 게시판. 학교 이메일로만 가입

학교 학생들 간의 안전한 중고 교재 거래를 위한 교내 전용 마켓플레이스

## Decisions already made
These were decided by the owner. Do not change them; ask if one blocks you.
- 학교 이메일 인증 범위는 어떻게 제한할까요? → **특정 학교 도메인만 허용**
- 교재 가격 표기와 네고(가격 협상)는 어떻게 처리할까요? → **정가 기입 및 가격 제안 허용 여부 선택**
- 거래 완료된 게시글은 어떻게 처리할까요? → **판매 완료 후 일정 기간 보관 후 자동 숨김**
- 사용자 인증 및 로그인 방식은 어떻게 할까요? → **이메일과 비밀번호 회원가입 + 학교 메일 인증**
- 책 사진 업로드를 위한 저장소는 어떻게 구성할까요? → **클라우드 스토리지 사용**

## Domain rules
Business rules decided by the owner. Implement them exactly and keep them in the business-logic layer, not in UI code.
- 학교 공식 이메일 도메인과 일치하는 메일로 인증 링크를 받은 경우에만 회원가입과 게시판 이용을 허용한다.
- 모든 판매글은 판매 가격을 필수로 입력해야 하며, 가격 제안 기능의 활성화 여부는 작성자가 결정한다.
- 판매 완료된 게시글은 30일간 마이페이지에서 조회할 수 있으며 이후 메인 목록에서 제외된다.

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
- Limit upload size and allowed file types on the server, store uploads outside the web root, and never execute or render uploaded files as HTML.
- Add rate limiting to login and to any endpoint that calls a paid or quota-limited external API.

## Recommended stack
Use these unless a decision above says otherwise.
- 화면 및 프레임워크: **Next.js** — 서버와 클라이언트 로직을 한 번에 작성할 수 있으며 빠른 웹앱 개발이 가능합니다.
- 데이터 저장 및 로그인: **Supabase** — 관계형 데이터베이스, 이메일 인증 로그인, 파일 스토리지를 하나의 플랫폼에서 무료로 제공합니다.
- 배포: **Vercel** — Next.js 프로젝트를 가장 쉽고 빠르게 무료로 배포할 수 있습니다.

## Build plan
Work through these in order. Finish and verify one before starting the next.
1. 프로젝트 초기 설정 및 데이터베이스 스키마 작성 [difficulty: easy]
   - Done when: Next.js 프로젝트가 생성되고 Supabase 연결과 함께 사용자, 게시글, 가격 제안 테이블 스키마가 생성되었습니다.
   - Watch out: 환경 변수 누락으로 인한 연결 실패
   - Watch out: 외래 키 제약조건 설정 누락
2. 학교 이메일 도메인 제한 회원가입 및 인증 구현 [difficulty: medium]
   - Done when: 특정 학교 도메인 이메일로만 가입할 수 있고 인증 메일 확인 후 로그인이 가능합니다.
   - Watch out: 도메인 검증 로직 우회 가능성
   - Watch out: 인증되지 않은 유저의 접근 허용
3. 책 사진 업로드 및 클라우드 스토리지 연동 [difficulty: medium]
   - Done when: 게시글 작성 시 책 사진을 업로드할 수 있으며 클라우드 스토리지에 안전하게 저장되고 URL이 반환됩니다.
   - Watch out: 허용되지 않은 대용량 파일이나 악성 파일 업로드
   - Watch out: 스토리지 공개 권한 설정 오류
4. 교재 거래 게시글 작성 및 목록/상세 조회 구현 [difficulty: easy]
   - Done when: 정가 기입, 가격 제안 허용 여부 선택, 사진 첨부가 포함된 게시글을 작성하고 목록과 상세 페이지에서 확인할 수 있습니다.
   - Watch out: 입력값 검증 누락으로 인한 XSS 취약점
   - Watch out: 가격에 음수나 문자열 입력 방지
5. 가격 제안 및 판매 완료 상태 관리 기능 구현 [difficulty: medium]
   - Done when: 구매 희망자가 가격 제안을 할 수 있고 판매자가 이를 확인하여 거래를 완료 상태로 바꿀 수 있습니다.
   - Watch out: 판매자가 아닌 사람이 임의로 게시글 상태를 변경하는 보안 허점
   - Watch out: 가격 제안 중복 등록 문제

## Working style
- If a requirement is ambiguous and not covered above, ask one question instead of guessing.
- Do not add features that are not in the goal or the build plan.
