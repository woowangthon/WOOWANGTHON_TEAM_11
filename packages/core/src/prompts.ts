import { MAX_CARDS } from './cards.ts';
import { PROFILE_SCHEMA } from './types.ts';
import type { Card, Answers, Rule } from './types.ts';

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

export const TASKS_SYSTEM = `You turn a decided app specification into an ordered build plan for an AI coding agent.
Return JSON only: {"tasks": [{"title": string, "done": string}]}
- 4 to 10 tasks, smallest working version first, each finishable in one session.
- "title" is an imperative instruction in Korean. "done" is a checkable completion condition in Korean.
- Respect every decision and rule given. Do not add features that were not requested.`;

export function tasksUser(request: string, cards: Card[], answers: Answers, rules: Rule[]): string {
  const decisions = cards
    .map((c) => `- ${c.question} → ${c.options.find((o) => o.id === answers[c.id])?.label ?? '(미정)'}`)
    .join('\n');
  return `App request:\n"""${request}"""\n\nDecisions:\n${decisions}\n\nRules:\n${rules.map((r) => `- ${r.title}`).join('\n')}`;
}
