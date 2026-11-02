import { MAX_CARDS } from './cards.ts';
import { PROFILE_SCHEMA } from './types.ts';
import type { Decision, Profile, Rule } from './types.ts';
import { SKILLS } from './skills.ts';

const profileVocabulary = Object.entries(PROFILE_SCHEMA)
  .map(([key, values]) => `- ${key}: ${values.join(' | ')}`)
  .join('\n');

export const CARDS_SYSTEM = `You help a non-developer prepare an app request before it is sent to an expensive AI coding agent.
Find the decisions where the request can be read in more than one way and where guessing wrong would cause rework.
The most valuable decisions are business rules, not technology. Find those first.
Return JSON only, in Korean, with this shape:
{"summary": string,
 "feasibility": {"tier": "personal" | "team" | "enterprise", "why": string, "risks": [string], "scopeDown": string},
 "cards": [{"kind": "domain" | "tech", "question": string, "why": string,
  "options": [{"label": string, "detail": string, "recommended": boolean, "sets": object, "policy": string,
               "difficulty": "easy" | "medium" | "hard", "effort": string}]}]}

Feasibility comes first. Judge the whole project the way a senior engineer would when a non-developer says they will build it alone with an AI coding agent. Starting something far too big and abandoning it halfway is the worst outcome, so be blunt and do not soften:
- "personal": one person with an AI agent can ship a working version in days to a few weeks (club attendance, todo list, personal budget, small booking page).
- "team": needs real backend and operations experience or several people: real payments and refunds, marketplaces, real-time features, thousands of concurrent users, many integrations.
- "enterprise": regulated, high-stakes or targeted by attackers: holding or moving other people's money or crypto (exchanges, wallets, trading, remittance), medical records, identity verification. Running it for real needs a company: security audits, legal compliance, 24/7 operation. A Bitcoin exchange is "enterprise" even when the request sounds small.
- "why": one or two Korean sentences naming the concrete reasons (cost, regulation, security, operations, scale).
- "risks": up to 3 short Korean phrases on what is most likely to go wrong.
- "scopeDown": for "team" or "enterprise", one Korean sentence describing the smaller version one person could actually finish (e.g. "실제 거래 없이 시세 조회와 모의 투자만 제공"). "" for "personal".

Domain cards ("kind": "domain"), 3 to 5 of them, come first:
- Business rules this specific app must settle that the request leaves open. Look for: how states are distinguished (e.g. late vs absent), how amounts are calculated, who may create, change or delete what, whether changes keep a history, whether one user can belong to several groups, who can see what, and what happens on cancellation, refund, correction or deletion.
- When money, fines, points or balances are involved, always ask how corrections and refunds work and whether every change is recorded.
- Each option's "policy" is the rule it fixes, as one plain Korean sentence the coding agent can implement (e.g. "지각은 결석과 별도의 벌금을 적용한다."). Domain options usually leave "sets" empty, except "money": "yes" when the app calculates or moves money.

Tech cards ("kind": "tech") follow:
- Cover where it runs, login, where data is stored, expected scale (how many users, traffic spikes; sets "scale"), and whether it needs uploads, payments or external APIs, phrased for this app. If the request already states the scale (e.g. "대규모 트래픽"), recommend the matching option. "policy" is "" for tech cards.

Rules for all cards:
- Every option has "difficulty": how much choosing it adds to the build for a non-developer working with an AI coding agent, and "effort": one short Korean phrase on why (e.g. "웹훅·환불 처리 필요"). Compare options within a card honestly; the simplest option is usually "easy".
- At most ${MAX_CARDS} cards in total, 2 to 4 options each, exactly one option with "recommended": true.
- Recommend the simplest option that still satisfies the request.
- "why" says in one sentence what goes wrong later if this is left undecided.
- "sets" may only use these keys and values (omit keys the option does not decide):
${profileVocabulary}
- Plain words. No jargon a non-developer would not know.`;

export function cardsUser(request: string): string {
  return `App request:\n"""${request}"""`;
}

export const TASKS_SYSTEM = `You turn a decided app specification into an ordered build plan for an AI coding agent, and recommend a tech stack.
Return JSON only:
{"tasks": [{"title": string, "done": string, "difficulty": "easy" | "medium" | "hard", "reason": string,
            "watchouts": [string], "securityChecks": [{"what": string, "how": string}]}],
 "stack": [{"area": string, "choice": string, "why": string, "connects": string}],
 "budget": {"freeTier": "full" | "partial" | "none", "assumedScale": string, "monthly": string, "summary": string,
            "items": [{"name": string, "free": string, "paid": string}]},
 "securityFocus": [{"what": string, "steps": [string]}],
 "skills": [{"id": string, "reason": string}]}
- 4 to 10 tasks, smallest working version first, each finishable in one session.
- "title" is an imperative instruction in Korean. "done" is a checkable completion condition in Korean.
- "difficulty" estimates how hard the task is for a non-developer working with an AI coding agent; "reason" explains concretely why, in one or two Korean sentences.
  - "easy": screens, forms and simple create/read/update/delete on one user's own data.
  - "medium": login, permissions between users, file uploads, calling one external API.
  - "hard": anything about scale or speed (traffic, caching, rate limiting, performance), concurrency or real-time updates, payments, refunds or webhooks, money calculations, data migration.
- "watchouts": 1 to 3 specific problems this task must handle (edge cases, failure modes, security traps), in Korean.
- "securityChecks": SECURITY ONLY, usually empty. Include an item only when this task creates a real security or privacy risk that a non-developer must verify by hand because the AI cannot be trusted to judge it (a secret committed or exposed, personal data visible to others, money handled wrongly). Never include ordinary "does the feature work" checks. "how" gives concrete steps a non-developer can follow, in Korean.
- "budget": a realistic running-cost estimate for this app with the recommended stack, at the scale the owner described in the request, notes and decisions (for example "대규모 트래픽" means thousands of users or more, which is beyond free tiers). Only when nothing indicates scale, assume about 100 users. "assumedScale" states the scale you assumed in Korean. "freeTier" says whether it can run entirely on free tiers at that scale. "monthly" is a KRW range. "items" lists each paid-capable service with what its free tier covers and what it costs at that scale, in Korean. "summary" says in one Korean sentence how far the free tier goes and what pushes it to paid.
- "securityFocus": 2 to 4 security or privacy checks specific to THIS app's data and rules (e.g. for a fine-tracking app: "다른 회원의 벌금 금액을 바꿀 수 없는지"), not generic advice. "steps" are 2 to 4 concrete steps a non-developer can do in the running app or the repository, in Korean.
- "skills": pick 2 to 4 from this catalog only (use the exact id) that fit this project best, with "reason" in one Korean sentence about this project:
${SKILLS.map((s) => `  - ${s.id}: ${s.what}`).join('\n')}
- 3 to 6 stack items: "area" in Korean (e.g. 화면, 데이터 저장, 로그인, 배포), "choice" a concrete product or library name, "why" its role in this app in one Korean sentence, "connects" how it works with the other picks in one Korean sentence. Prefer free-tier, widely used options that coding agents know well.
- One tool per responsibility. If the database provider also offers login (e.g. Supabase, Firebase), either use it for login or say in "connects" why a separate login library is used and which one owns user identity and data permissions.
- The stack must not contradict the decisions (e.g. no server database when the owner chose device storage).
- Respect every decision and rule given. Do not add features that were not requested.`;

export function tasksUser(request: string, decisions: Decision[], rules: Rule[], notes = '', domainRules: string[] = [], profile?: Profile): string {
  const lines = decisions.map((d) => `- ${d.question} → ${d.answer}`).join('\n');
  const business = domainRules.length ? `\n\nBusiness rules (implement exactly):\n${domainRules.map((r) => `- ${r}`).join('\n')}` : '';
  const extra = `${business}${notes.trim() ? `\n\nOwner's notes:\n"""${notes.trim()}"""` : ''}`;
  const scale = profile ? `\n\nExpected scale chosen by the owner: ${profile.scale === 'large' ? 'large (thousands of users or more, traffic spikes)' : 'small (tens to hundreds of users)'}` : '';
  return `App request:\n"""${request}"""\n\nDecisions:\n${lines}${extra}${scale}\n\nRules:\n${rules.map((r) => `- ${r.title}`).join('\n')}`;
}
