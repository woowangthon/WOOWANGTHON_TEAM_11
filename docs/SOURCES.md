# 출처

발표 부록에 그대로 옮긴다. 문제 근거 수치 중 일부(Veracode, Escape.tech, GitClear)는 아래 2차 자료를 통해 인용했다.

## 데이터
| 이름 | 출처 URL | 라이선스 | 용도 |
|---|---|---|---|
| Vibe Coding Security Debt (CSA, Veracode 2025 수치 인용) | https://labs.cloudsecurityalliance.org/research/csa-research-note-ai-codegen-vulnerability-debt-20260406-csa/ | 인용 | 문제 근거: 보안 |
| Vibe coding failures (Autonoma, Escape.tech 스캔 인용) | https://www.getautonoma.com/blog/vibe-coding-failures | 인용 | 문제 근거: 노출된 비밀키 |
| AI coding anti-patterns (Unblocked, GitClear 2025 인용) | https://getunblocked.com/blog/ai-coding-anti-patterns/ | 인용 | 문제 근거: 중복 코드 |
| Your AI bill is a code quality problem (Sonar) | https://www.sonarsource.com/blog/your-ai-bill-is-a-code-quality-problem/ | 인용 | 문제 근거: 토큰·품질 |
| Messy code is a hidden tax on coding agents (Engineer's Codex) | https://www.engineerscodex.com/messy-code-hidden-tax-coding-agents | 인용 | 문제 근거: 토큰·품질 |
| Effects of task specifications on token spend (arXiv 2608.25399) | https://arxiv.org/pdf/2608.25399 | 인용 | 문제 근거: 사양서와 토큰 |

## 오픈소스
| 이름 | 저장소 | 라이선스 | 용도 |
|---|---|---|---|
| React | https://github.com/facebook/react | MIT | 화면 |
| Vite | https://github.com/vitejs/vite | MIT | 개발 서버·빌드 |
| esbuild | https://github.com/evanw/esbuild | MIT | 배포 함수 번들 |
| TypeScript | https://github.com/microsoft/TypeScript | Apache-2.0 | 타입 검사 |
| lucide-react | https://github.com/lucide-icons/lucide | ISC | 아이콘 |
| Pretendard | https://github.com/orioncactus/pretendard | OFL-1.1 | 글꼴 (jsDelivr CDN) |
| Anthropic TypeScript SDK | https://github.com/anthropics/anthropic-sdk-typescript | Apache-2.0 | 사용자가 자기 Claude 키를 쓸 때의 호출 |

## AI 모델 · API
| 이름 | 제공자 | 용도 |
|---|---|---|
| Gemini Flash-Lite / Flash (무료 티어) | Google | 규모 판정·갈림길 카드·기능 제안, 작업 계획·예산·맞춤 보안 확인·스킬 고르기, 영어 번역, 코드 점검 |
| Claude / GPT (선택, 사용자 키) | Anthropic / OpenAI | 사용자가 AI 설정에서 자기 키를 넣었을 때 위와 같은 일 |
| Claude (실험용, 서브에이전트) | Anthropic | 왕복 횟수 실험(#6)의 코딩 역할. 서비스에는 쓰지 않음 |

## 추천 스킬 (안내만 함, 코드에 포함하지 않음)
서비스는 이름·저장소 링크·설치 방법만 보여준다. 각 저장소와 스킬 폴더는 추가할 때 GitHub에서 존재를 확인했다.

| 저장소 | 스킬 |
|---|---|
| https://github.com/anthropics/skills | frontend-design, webapp-testing |
| https://github.com/obra/superpowers | verification-before-completion, test-driven-development, systematic-debugging, writing-plans |
| https://github.com/DietrichGebert/ponytail | ponytail |
| https://github.com/stripe/ai | stripe-best-practices |
| https://github.com/supabase/agent-skills | supabase-postgres-best-practices |
| https://github.com/trailofbits/skills | property-based-testing, insecure-defaults, supply-chain-risk-auditor, open-sourcing |
| https://github.com/vercel-labs/agent-skills | react-best-practices, react-native-skills |
| https://github.com/difficcd/skills-workshop | engineering-guardrails, ask-first |

## 설계 참고
- 유지보수 규칙 일부는 팀원이 만들어 실제 프로젝트에서 쓰는 Claude Code 스킬 [engineering-guardrails, ask-first](https://github.com/difficcd/skills-workshop)에서 가져와 일반화함
- 도구 비교(Kiro spec, spec-kit, Claude Code Plan Mode)는 2026-11 기준 각 도구 문서로 확인
