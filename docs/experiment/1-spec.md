# Project instructions

## Goal
동아리 회비 관리 앱. 회원별 납부 여부를 보고 미납자에게 알림을 보내고 싶어

동아리 회비 납부 확인 및 미납자 알림 앱에 대해, 실행 환경과 데이터 저장 방식 등 개발 방향을 결정합니다.

## Decisions already made
These were decided by the owner. Do not change them; ask if one blocks you.
- 앱이 주로 어디서 실행되어야 하나요? → **웹사이트**
- 로그인 방식은 어떻게 할까요? → **로그인 없음**
- 회비 납부 데이터는 어디에 저장할까요? → **서버 데이터베이스**
- 미납자 알림은 어떤 방식으로 보낼까요? → **앱 내 알림 및 수동 복사**
- 영수증이나 통장 입출금 캡처 화면을 업로드하는 기능이 필요한가요? → **필요 없음**
- 앱 안에서 직접 회비를 결제하는 기능이 필요한가요? → **필요 없음**

## Engineering rules
- Before writing features, create the folder layout below and keep to it: pure logic in `src/core/` (no UI, no network), UI in `src/ui/`, external calls in `src/services/`. Do not put business logic inside UI components.
- Keep every source file under 300 lines. When a file approaches the limit, split it by responsibility before adding more.
- Never copy logic. The second time the same logic is needed, extract it into a shared function and use it from both places.
- Never swallow errors. Every failure must either be shown to the user, logged, or thrown. No empty catch blocks.
- Store each piece of state in exactly one place and derive everything else from it. Never keep a copy that must be updated in sync.

## Security rules
- Never write API keys, passwords or tokens in source code. Read them from environment variables, keep `.env` in `.gitignore`, and commit a `.env.example` with empty values.
- Validate every user input on the server side (type, length, format) before using it. Never trust validation done only in the browser.
- Use parameterized queries only. If using a hosted database (e.g. Supabase, Firebase), enable row-level security or security rules before launch; never ship with open read/write.

## Build plan
Work through these in order. Finish and verify one before starting the next.
1. 프로젝트 폴더 구조 설정 및 기본 환경 구성
   - Done when: 클라이언트와 서버의 디렉토리 구조가 생성되고 기본 의존성이 설치됨
2. 서버 데이터베이스 연결 및 회원/회비 스키마 설정
   - Done when: DB 연결이 완료되고 회원 및 회비 납부 내역 저장을 위한 테이블이 생성됨
3. 회원 목록 조회 및 등록 API 구현
   - Done when: 회원을 추가하고 전체 회원 목록을 조회하는 API가 정상 동작함
4. 회비 납부 상태 관리 API 구현
   - Done when: 특정 회원의 월별 회비 납부 여부를 수정하고 조회하는 API가 구현됨
5. 웹 프론트엔드 기본 레이아웃 및 회원 관리 화면 구현
   - Done when: 웹 화면에서 회원 목록을 확인하고 새로운 회원을 등록할 수 있음
6. 회비 납부 현황판 및 납부 상태 토글 기능 구현
   - Done when: 웹 화면에서 회원별 납부 여부를 표 형태로 확인하고 클릭 한 번으로 납부 상태를 변경할 수 있음
7. 미납자 필터링 및 알림 메시지 수동 복사 기능 구현
   - Done when: 미납자만 필터링하여 확인하고, 독촉 알림 메시지 텍스트를 클립보드로 복사할 수 있음
8. 입력값 검증 및 예외 처리 보완
   - Done when: 모든 API와 폼 입력에 대한 유효성 검사가 적용되고 에러 발생 시 사용자에게 명확히 피드백됨

## Working style
- If a requirement is ambiguous and not covered above, ask one question instead of guessing.
- Do not add features that are not in the goal or the build plan.
