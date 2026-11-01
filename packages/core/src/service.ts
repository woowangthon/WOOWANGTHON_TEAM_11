import { FALLBACK_CARDS, MAX_CARDS, parseCards } from './cards.ts';
import { chatJson, extractJson } from './llm.ts';
import type { LlmConfig } from './llm.ts';
import { CARDS_SYSTEM, TASKS_SYSTEM, cardsUser, tasksUser } from './prompts.ts';
import { fallbackTasks, parseTasks } from './tasks.ts';
import type { Card, Decision, Profile, Rule, Source, Task } from './types.ts';

export const MAX_REQUEST_CHARS = 2000;

export interface Generated<T> {
  data: T;
  source: Source;
  model: string | null;
  /** Why the fallback was used. Shown to the user, never hidden. */
  error: string | null;
}

export function validateRequest(request: unknown): string {
  if (typeof request !== 'string' || !request.trim()) throw new Error('앱 설명을 입력해 주세요.');
  if (request.length > MAX_REQUEST_CHARS) throw new Error(`앱 설명은 ${MAX_REQUEST_CHARS}자 이내로 입력해 주세요.`);
  return request.trim();
}

export async function generateCards(
  llm: LlmConfig,
  request: string,
): Promise<Generated<{ summary: string; cards: Card[] }>> {
  try {
    const res = await chatJson(llm, CARDS_SYSTEM, cardsUser(request));
    return { data: parseCards(extractJson(res.text)), source: 'ai', model: res.model, error: null };
  } catch (err) {
    return { data: { summary: '', cards: FALLBACK_CARDS }, source: 'fallback', model: null, error: (err as Error).message };
  }
}

export async function generateTasks(
  llm: LlmConfig,
  request: string,
  decisions: Decision[],
  rules: Rule[],
  profile: Profile,
): Promise<Generated<Task[]>> {
  try {
    const res = await chatJson(llm, TASKS_SYSTEM, tasksUser(request, decisions, rules));
    return { data: parseTasks(extractJson(res.text)), source: 'ai', model: res.model, error: null };
  } catch (err) {
    return { data: fallbackTasks(profile), source: 'fallback', model: null, error: (err as Error).message };
  }
}

/** Validates decisions that arrived from a client. */
export function parseDecisions(raw: unknown): Decision[] {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_CARDS) throw new Error('decisions: expected 1-7 items');
  return raw.map((d, i) => {
    const item = d as Record<string, unknown>;
    if (typeof item?.question !== 'string' || typeof item?.answer !== 'string') throw new Error(`decisions[${i}]: expected strings`);
    return { question: item.question.slice(0, 80), answer: item.answer.slice(0, 40) };
  });
}
