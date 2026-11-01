// A minimal OpenAI-compatible chat client. Gemini, Groq and OpenRouter all expose this
// shape, so switching provider is a change of base URL, key and model names only.

export interface LlmConfig {
  baseUrl: string;
  apiKey: string;
  /** Tried in order; the next one is used when a model is rate-limited or unavailable. */
  models: string[];
  fetch?: typeof fetch;
  timeoutMs?: number;
}

export interface LlmResult {
  text: string;
  model: string;
  usage: { promptTokens: number; completionTokens: number } | null;
}

export const GEMINI_OPENAI_BASE = 'https://generativelanguage.googleapis.com/v1beta/openai';

export class LlmError extends Error {
  readonly attempts: string[];
  constructor(message: string, attempts: string[]) {
    super(message);
    this.name = 'LlmError';
    this.attempts = attempts;
  }
}

// 429 = quota, 5xx = provider trouble: worth trying the next model. 4xx otherwise is our bug.
const retryable = (status: number) => status === 429 || status >= 500;

export async function chatJson(config: LlmConfig, system: string, user: string): Promise<LlmResult> {
  if (!config.apiKey) throw new LlmError('no API key configured', []);
  const doFetch = config.fetch ?? fetch;
  const attempts: string[] = [];

  for (const model of config.models) {
    let res: Response;
    try {
      res = await doFetch(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.4,
        }),
        signal: AbortSignal.timeout(config.timeoutMs ?? 30_000),
      });
    } catch (err) {
      attempts.push(`${model}: ${(err as Error).message}`);
      continue;
    }

    if (!res.ok) {
      attempts.push(`${model}: HTTP ${res.status}`);
      if (retryable(res.status)) continue;
      throw new LlmError(`request rejected (HTTP ${res.status})`, attempts);
    }

    const body = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    const text = body.choices?.[0]?.message?.content;
    if (!text) {
      attempts.push(`${model}: empty response`);
      continue;
    }
    const usage = body.usage
      ? { promptTokens: body.usage.prompt_tokens ?? 0, completionTokens: body.usage.completion_tokens ?? 0 }
      : null;
    return { text, model, usage };
  }
  throw new LlmError('all models failed', attempts);
}

/** Models sometimes wrap JSON in a code fence even when asked not to. */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = (fenced ? fenced[1] : text).trim();
  return JSON.parse(candidate);
}
