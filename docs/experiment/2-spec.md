# Project instructions

## Goal
스터디 모임 출석체크랑 벌금 정산해주는 웹사이트

스터디 모임의 출석과 벌금을 관리하는 웹사이트 구축을 위해 명확히 해야 할 주요 결정사항들입니다.

## Decisions already made
These were decided by the owner. Do not change them; ask if one blocks you.
- 어디서 접속해서 사용하는 웹사이트를 원하시나요? → **모바일과 컴퓨터 모두에서 잘 보이는 웹사이트**
- 로그인 방식은 어떻게 할까요? → **간편한 소셜 로그인 (카카오, 네이버 등)**
- 출석과 벌금 데이터는 어디에 저장할까요? → **서버 데이터베이스에 안전하게 보관**
- 영수증이나 증빙 자료를 사진으로 올리는 기능이 필요한가요? → **사진 업로드 기능 없음**
- 실제 돈을 주고받는 결제 기능이 필요한가요? → **벌금 액수 계산 및 장부 기록만 (실제 결제 없음)**
- 카카오톡이나 문자 등으로 알림을 보내는 외부 기능이 필요한가요? → **외부 서비스 연동 없음 (앱 안에서만 확인)**

## Engineering rules
- Before writing features, create the folder layout below and keep to it: pure logic in `src/core/` (no UI, no network), UI in `src/ui/`, external calls in `src/services/`. Do not put business logic inside UI components.
- Keep every source file under 300 lines. When a file approaches the limit, split it by responsibility before adding more.
- Never copy logic. The second time the same logic is needed, extract it into a shared function and use it from both places.
- Never swallow errors. Every failure must either be shown to the user, logged, or thrown. No empty catch blocks.
- Record every non-obvious design decision in `docs/decisions.md` as one entry: decision, reason, rejected alternative.
- Store each piece of state in exactly one place and derive everything else from it. Never keep a copy that must be updated in sync.

## Security rules
- Never write API keys, passwords or tokens in source code. Read them from environment variables, keep `.env` in `.gitignore`, and commit a `.env.example` with empty values.
- Validate every user input on the server side (type, length, format) before using it. Never trust validation done only in the browser.
- Check on the server, for every request, that the logged-in user may access the requested data. Never rely on hiding buttons in the UI.
- Use parameterized queries only. If using a hosted database (e.g. Supabase, Firebase), enable row-level security or security rules before launch; never ship with open read/write.
- Add rate limiting to login and to any endpoint that calls a paid or quota-limited external API.

## Build plan
Work through these in order. Finish and verify one before starting the next.
1. 프로젝트 폴더 구조 설정 및 기본 환경 구성
   - Done when: 요청된 규칙과 폴더 구조에 맞춰 프론트엔드와 백엔드 기본 보일러플레이트가 생성되고 빌드 및 실행이 정상적으로 완료됨
2. 데이터베이스 설계 및 보안/접근 규칙 설정
   - Done when: 유저, 스터디, 출석, 벌금 장부 테이블 스키마가 정의되고 서버 DB 접근 규칙과 비밀키 환경 변수 분리가 완료됨
3. 소셜 로그인 및 인증 시스템 구현
   - Done when: 카카오/네이버 등 간편 소셜 로그인 연동이 완료되고 서버에서 세션 또는 토큰 권한이 정상 검증됨
4. 스터디 모임 생성 및 멤버 관리 기능 구현
   - Done when: 사용자가 스터디 그룹을 만들고 멤버로 참여할 수 있으며 서버에서 입력값 검증과 요청 횟수 제한이 적용됨
5. 출석 체크 기능 구현
   - Done when: 모바일과 PC 모두에서 스터디 일정별 출석 상태(출석, 지각, 결석)를 기록하고 조회할 수 있음
6. 벌금 자동 계산 및 장부 정산 기능 구현
   - Done when: 출석 데이터(지각, 결석 등)를 기반으로 벌금이 자동 계산되어 스터디별 장부에 누적 기록되고 모니터링됨

## Working style
- If a requirement is ambiguous and not covered above, ask one question instead of guessing.
- Do not add features that are not in the goal or the build plan.
