# 프로젝트 규모 판정 반복 점검

- 실행일: 2026-11-14 · 모델: 서비스와 동일 (gemini-flash-lite-latest, 실패 시 gemini-flash-latest)
- 요청 20개 × 3회 = 60회 실행. 앞 10개는 11/4 점검과 같은 요청, 뒤 10개는 11/14 추가 (기대값은 실행 전에 적음)
- 기대값은 "비개발자 1명이 AI 코딩 도구로 만든다"는 전제의 판단 (Claude가 작성, 정답이 아님)
- AI 단독 = 규칙 적용 전, 최종 = 화면에 나가는 판정 (규칙 바닥 적용 후)

## 결과
- 최종 판정 일치: 54/60회 (90%) · AI 단독 일치: 48/60회 (80%)
- 3회 모두 같은 최종 판정이 나온 요청: 15/20개
- 3회 모두 기대와 일치한 요청: 15/20개

| 요청 | 기대 | AI 단독 (회차별) | 최종 (회차별) | 최종 일치 |
|---|---|---|---|---|
| 비트코인 사고팔 수 있는 거래소 웹사이트 | enterprise | enterprise · enterprise · enterprise | enterprise · enterprise · enterprise | 3/3 |
| 원격 진료 예약하고 의사가 처방전 보내주는 앱 | enterprise | enterprise · enterprise · enterprise | enterprise · enterprise · enterprise | 3/3 |
| 중고 PC 부품 사고파는 마켓, 안전결제 포함 | team | team · team · 실패 | team · team · team | 3/3 |
| 친구들이랑 하는 실시간 멀티 대전 웹게임 | team | team · team · team | team · team · team | 3/3 |
| 동아리 출석체크 앱 | personal | personal · personal · 실패 | personal · personal · 실패 | 2/3 |
| 혼자 쓰는 가계부 | personal | personal · personal · personal | personal · personal · 실패 | 2/3 |
| 깃허브 이슈 들어오면 라벨 추천해주는 내 오픈소스용 봇 | personal | personal · personal · personal | personal · personal · personal | 3/3 |
| 오픈소스 mv 만들기용 애니메이션 제작 툴. 개인용 테스트 가능하며 상업용 판매 예정 | team | team · team · team | team · team · team | 3/3 |
| 오픈소스 mv 만들기용 애니메이션 제작 툴. 개인 사용 및 오픈소스로 누구나 수정가능하게 하는 수준 | personal | personal · personal · personal | personal · 실패 · personal | 2/3 |
| AI가 그린 그림인지 사람이 그린 그림인지 판별하는 프로그램 | enterprise | personal · personal · 실패 | enterprise · enterprise · enterprise | 3/3 |
| 내 포트폴리오 소개 웹사이트 | personal | personal · personal · personal | personal · personal · personal | 3/3 |
| 혼자 쓰는 레시피 기록 앱 | personal | personal · personal · 실패 | personal · personal · personal | 3/3 |
| 학과 공지사항을 모아서 나한테 알려주는 텔레그램 봇 | personal | personal · personal · personal | personal · personal · personal | 3/3 |
| 회의 녹음을 올리면 요약해 주는 내 개인용 도구 (외부 음성인식 API 사용) | personal | personal · personal · 실패 | personal · personal · personal | 3/3 |
| 우리 카페 테이블 QR로 메뉴 주문하고 카드 결제까지 | team | team · team · team | team · team · team | 3/3 |
| 수제 액세서리 파는 작은 쇼핑몰, 결제와 배송 조회 포함 | team | 실패 · team · team | team · team · team | 3/3 |
| 동네 사람들끼리 쓰는 실시간 단체 채팅 앱 | team | team · personal · team | personal · team · personal | 1/3 |
| 주식 자동매매 프로그램, 내 증권 계좌로 실제 주문 | enterprise | enterprise · enterprise · enterprise | enterprise · enterprise · enterprise | 3/3 |
| 병원에서 쓰는 환자 진료 기록 관리 시스템 | enterprise | 실패 · enterprise · enterprise | enterprise · enterprise · enterprise | 3/3 |
| 가게·라이더·고객을 연결하는 음식 배달 앱 | enterprise | enterprise · team · team | team · enterprise · enterprise | 2/3 |

## 한계
- 기대값이 판단이라 정답이 아님. 위험 분야(암호화폐·금융·의료 등)는 규칙 바닥이 있어 최종 일치가 규칙 덕분일 수 있음 → AI 단독 열과 같이 볼 것
- 원본: results.json
