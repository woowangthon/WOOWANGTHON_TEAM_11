Fix the following issues in the code you wrote. Change nothing else.

1. [역할별로 나눠 두기] 비즈니스 규칙(벌금 계산 등)과 서버 라우팅 로직을 별도의 모듈로 분리하세요.
   Where: server.js
2. [조용히 실패하지 않기] catch 블록에서 에러를 무시하지 말고 로그를 남기거나 처리하세요.
   Where: server.js: load()
3. [결정 기록 남기기] docs/decisions.md 파일을 생성하고 주요 설계 결정을 기록하세요.
   Where: docs/decisions.md
4. [돈이 걸린 데이터는 기록으로 남기기] 납부 금액을 직접 수정하거나 덮어쓰지 말고, 변경 이력을 장부 형태로 기록하세요.
   Where: server.js: app.post("/api/payments")
5. [권한은 서버에서 확인] 서버 요청마다 로그인된 사용자의 권한을 확인하는 로직을 추가하세요.
   Where: server.js
6. [DB 접근 규칙 설정] JSON 파일 직접 접근 대신 적절한 데이터베이스 및 파라미터화된 쿼리를 사용하세요.
   Where: server.js: data.json
7. [요청 횟수 제한] 로그인 및 주요 엔드포인트에 rate limiting 미들웨어를 추가하세요.
   Where: server.js

After fixing, list what you changed, one line per issue.
