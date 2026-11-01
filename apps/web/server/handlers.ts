// Framework-free request handlers. The Vercel functions in `api/` and the Vite dev
// middleware both call these, so local and deployed behaviour cannot drift apart.
import {
  GEMINI_OPENAI_BASE,
  findRule,
  generateCards,
  generateTasks,
  parseDecisions,
  parseProfile,
  reviewCode,
  translateToEnglish,
  validateCode,
  validateLines,
  validateNotes,
  validateRequest,
  byokConfig,
} from '@spec/core';
import type { ByokInput, LlmConfig } from '@spec/core';

export interface HandlerResult {
  status: number;
  body: unknown;
}

export type Env = Record<string, string | undefined>;

/** Bring-your-own-key fields, read from request headers by the adapters. */
export type Byok = ByokInput;
export const NO_BYOK: Byok = { provider: null, key: null, model: null };

/** The user's own key when one was sent (validated, fixed provider URL), else the server's. */
export function llmConfig(env: Env, byok: Byok = NO_BYOK): LlmConfig {
  const own = byokConfig(byok);
  if (own) return own;
  return {
    baseUrl: env.LLM_BASE_URL || GEMINI_OPENAI_BASE,
    apiKey: env.LLM_API_KEY || env.GEMINI_API_KEY || '',
    // Lite first: this service's whole claim is that the cheap model does the prep work.
    models: (env.LLM_MODELS || 'gemini-flash-lite-latest,gemini-flash-latest').split(',').map((m) => m.trim()),
  };
}

// Best-effort limit per server instance. The free quota is shared by every visitor, so one
// client looping on the endpoint would otherwise switch AI off for everyone.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 10;
const hits = new Map<string, number[]>();

export function rateLimited(clientId: string, now = Date.now()): boolean {
  const recent = (hits.get(clientId) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(clientId, recent);
  return recent.length > MAX_PER_WINDOW;
}

const badRequest = (err: unknown): HandlerResult => ({ status: 400, body: { error: (err as Error).message } });
const tooMany: HandlerResult = { status: 429, body: { error: '요청이 너무 많습니다. 1분 뒤에 다시 시도해 주세요.' } };

export async function handleCards(raw: unknown, env: Env, clientId: string, byok: Byok = NO_BYOK): Promise<HandlerResult> {
  if (rateLimited(clientId)) return tooMany;
  let request: string;
  let llm: LlmConfig;
  try {
    llm = llmConfig(env, byok);
    request = validateRequest((raw as Record<string, unknown>)?.request);
  } catch (err) {
    return badRequest(err);
  }
  return { status: 200, body: await generateCards(llm, request) };
}

export async function handleReview(raw: unknown, env: Env, clientId: string, byok: Byok = NO_BYOK): Promise<HandlerResult> {
  if (rateLimited(clientId)) return tooMany;
  const obj = (raw ?? {}) as Record<string, unknown>;
  let input;
  let llm: LlmConfig;
  try {
    llm = llmConfig(env, byok);
    if (!Array.isArray(obj.ruleIds) || obj.ruleIds.length === 0) throw new Error('점검할 규칙을 하나 이상 골라 주세요.');
    input = { code: validateCode(obj.code), rules: obj.ruleIds.map((id) => findRule(String(id))) };
  } catch (err) {
    return badRequest(err);
  }
  return { status: 200, body: await reviewCode(llm, input.code, input.rules) };
}

export async function handleTasks(raw: unknown, env: Env, clientId: string, byok: Byok = NO_BYOK): Promise<HandlerResult> {
  if (rateLimited(clientId)) return tooMany;
  const obj = (raw ?? {}) as Record<string, unknown>;
  let input;
  let llm: LlmConfig;
  try {
    llm = llmConfig(env, byok);
    if (!Array.isArray(obj.ruleIds)) throw new Error('ruleIds: expected an array');
    input = {
      request: validateRequest(obj.request),
      decisions: parseDecisions(obj.decisions),
      rules: obj.ruleIds.map((id) => findRule(String(id))),
      profile: parseProfile(obj.profile),
      notes: validateNotes(obj.notes),
      domainRules: parseDomainRules(obj.domainRules),
    };
  } catch (err) {
    return badRequest(err);
  }
  return {
    status: 200,
    body: await generateTasks(llm, input.request, input.decisions, input.rules, input.profile, input.notes, input.domainRules),
  };
}

/** Domain rules arrive as plain sentences from the client; cap count and length like decisions. */
function parseDomainRules(raw: unknown): string[] {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw) || raw.length > 9) throw new Error('domainRules: expected up to 9 items');
  return raw.map((r, i) => {
    if (typeof r !== 'string') throw new Error(`domainRules[${i}]: expected a string`);
    return r.trim().slice(0, 240);
  });
}

export async function handleTranslate(raw: unknown, env: Env, clientId: string, byok: Byok = NO_BYOK): Promise<HandlerResult> {
  if (rateLimited(clientId)) return tooMany;
  let lines: string[];
  let llm: LlmConfig;
  try {
    llm = llmConfig(env, byok);
    lines = validateLines((raw as Record<string, unknown> | null)?.lines);
  } catch (err) {
    return badRequest(err);
  }
  return { status: 200, body: await translateToEnglish(llm, lines) };
}
