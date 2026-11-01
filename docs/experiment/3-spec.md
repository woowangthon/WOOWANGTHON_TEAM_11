# Project instructions

## Goal
중고 교재 거래 게시판. 사진 올리고 채팅으로 거래

중고 교재 거래 앱 제작을 위해 플랫폼, 로그인, 파일 저장, 외부 연동 등 구체적인 방식을 결정해야 합니다.

## Decisions already made
These were decided by the owner. Do not change them; ask if one blocks you.
- 앱이 실행될 기본 화면은 어디인가요? → **웹사이트**
- 로그인 방식은 어떻게 할까요? → **로그인 없음**
- 작성한 글과 사진은 어디에 저장할까요? → **서버 데이터베이스**
- 교재 사진을 업로드하는 기능이 필요한가요? → **필요함**
- 채팅이나 결제 등 외부 서비스를 연결하나요? → **외부 기능 없음**
- 이 앱의 완성도는 어느 정도를 원하시나요? → **간단한 시제품**

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
- Limit upload size and allowed file types on the server, store uploads outside the web root, and never execute or render uploaded files as HTML.

## Build plan
Work through these in order. Finish and verify one before starting the next.
1. 프로젝트 폴더 구조 설정 및 데이터베이스 스키마 정의
   - Done when: 서버 및 클라이언트 디렉토리 구조가 생성되고, 교재 게시글과 채팅 메시지용 DB 스키마가 설정됨
2. 백엔드 서버 기본 설정 및 파일 업로드 미들웨어 구현
   - Done when: Express 서버가 실행되고, 허용된 형식과 용량만 제한하여 이미지를 업로드할 수 있는 기능이 구현됨
3. 교재 게시글 등록 및 목록 조회 API 구현
   - Done when: 제목, 가격, 설명, 사진 경로를 입력받아 DB에 저장하고 목록을 조회하는 API가 작성됨
4. 게시글 상세 조회 및 삭제 API 구현
   - Done when: 특정 교재의 상세 정보와 이미지를 조회하고 삭제할 수 있는 API가 작성됨
5. 웹 프론트엔드 메인 페이지 및 교재 등록 폼 구현
   - Done when: 사용자가 교재 목록을 보고 제목, 설명, 가격, 사진을 입력하여 새 게시글을 등록할 수 있는 UI가 구현됨
6. 웹 프론트엔드 상세 페이지 및 1:1 채팅 기능 구현
   - Done when: 교재 상세 화면에서 사진과 정보를 확인하고, 외부 서비스 없이 내부 구현된 간단한 채팅으로 거래 대화를 할 수 있음
7. 입력값 검증 및 에러 핸들링 보완
   - Done when: 모든 API 요청에 대해 입력값 검증이 적용되고, 에러 발생 시 명확한 응답을 반환하도록 예외 처리가 추가됨

## Working style
- If a requirement is ambiguous and not covered above, ask one question instead of guessing.
- Do not add features that are not in the goal or the build plan.
