import { MAX_CARDS } from './cards.ts';
import { PROFILE_SCHEMA } from './types.ts';
import type { Decision, Rule } from './types.ts';

const profileVocabulary = Object.entries(PROFILE_SCHEMA)
  .map(([key, values]) => `- ${key}: ${values.join(' | ')}`)
  .join('\n');

export const CARDS_SYSTEM = `You help a non-developer prepare an app request before it is sent to an expensive AI coding agent.
Find the decisions where the request can be read in more than one way and where guessing wrong would cause rework.
Return JSON only, in Korean, with this shape:
{"summary": string, "cards": [{"question": string, "why": string, "options": [{"label": string, "detail": string, "recommended": boolean, "sets": object}]}]}

Rules:
- At most ${MAX_CARDS} cards, 2 to 4 options each, exactly one option with "recommended": true.
- Recommend the simplest option that still satisfies the request.
- "why" says in one sentence what goes wrong later if this is left undecided.
- Ask about the app's own features too, not only infrastructure.
- Always cover: where it runs, login, where data is stored, and whether it needs uploads, payments or external APIs, phrased for this app.
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
 "stack": [{"area": string, "choice": string, "why": string}],
 "budget": {"freeTier": "full" | "partial" | "none", "monthly": string, "summary": string,
            "items": [{"name": string, "free": string, "paid": string}]}}
- 4 to 10 tasks, smallest working version first, each finishable in one session.
- "title" is an imperative instruction in Korean. "done" is a checkable completion condition in Korean.
- "difficulty" estimates how hard the task is for a non-developer working with an AI coding agent; "reason" explains concretely why, in one or two Korean sentences.
- "watchouts": 1 to 3 specific problems this task must handle (edge cases, failure modes, security traps), in Korean.
- "securityChecks": SECURITY ONLY, usually empty. Include an item only when this task creates a real security or privacy risk that a non-developer must verify by hand because the AI cannot be trusted to judge it (a secret committed or exposed, personal data visible to others, money handled wrongly). Never include ordinary "does the feature work" checks. "how" gives concrete steps a non-developer can follow, in Korean.
- "budget": a realistic running-cost estimate for this app with the recommended stack, at small scale (about 100 users). "freeTier" says whether it can run entirely on free tiers. "monthly" is a KRW range (e.g. "0원", "0원~1만원"). "items" lists each paid-capable service with what its free tier covers and what paid costs, in Korean. "summary" says in one Korean sentence how far the free tier goes and what pushes it to paid.
- 3 to 6 stack items: "area" in Korean (e.g. 화면, 데이터 저장, 로그인, 배포), "choice" a concrete product or library name, "why" one short Korean sentence. Prefer free-tier, widely used options that coding agents know well.
- The stack must not contradict the decisions (e.g. no server database when the owner chose device storage).
- Respect every decision and rule given. Do not add features that were not requested.`;

export function tasksUser(request: string, decisions: Decision[], rules: Rule[], notes = ''): string {
  const lines = decisions.map((d) => `- ${d.question} → ${d.answer}`).join('\n');
  const extra = notes.trim() ? `\n\nOwner's notes:\n"""${notes.trim()}"""` : '';
  return `App request:\n"""${request}"""\n\nDecisions:\n${lines}${extra}\n\nRules:\n${rules.map((r) => `- ${r.title}`).join('\n')}`;
}
