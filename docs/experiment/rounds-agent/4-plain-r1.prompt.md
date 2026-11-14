Fix the following issues in the code you wrote. Change nothing else.

1. [결정 기록 남기기] 비관적 설계 결정 사항을 기록한 docs/decisions.md 파일을 생성하세요.
2. [권한은 서버에서 확인] 모든 요청에 대해 서버 측에서 로그인된 사용자가 요청된 데이터에 접근할 수 있는지 권한을 확인하는 로직을 추가하세요.
   Where: app.get("/api/bookings", (req, res) => {
3. [요청 횟수 제한] 로그인 및 주요 엔드포인트에 rate limiting 미들웨어를 추가하세요.
   Where: app.post("api/members", ...)

After fixing, list what you changed, one line per issue.
