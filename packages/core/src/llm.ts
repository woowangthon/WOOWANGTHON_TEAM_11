// One JSON-returning chat call over two wire formats: the OpenAI chat-completions shape
// (Gemini's compatibility endpoint, OpenAI itself) and Claude through the official SDK.
import Anthropic from '@anthropic-ai/sdk';

export interface LlmConfig {
  /** 'anthropic' goes through the Anthropic SDK; everything else speaks chat-completions at baseUrl. */
  kind?: 'openai-compatible' | 'anthropic';
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
  if (config.kind === 'anthropic') return chatAnthropic(config, system, user);
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

// Opus/Sonnet tiers accept server-side refusal fallbacks; Haiku has none.
const supportsFallback = (model: string) => /^claude-(opus|sonnet)-/.test(model);

async function chatAnthropic(config: LlmConfig, system: string, user: string): Promise<LlmResult> {
  const client = new Anthropic({
    apiKey: config.apiKey,
    fetch: config.fetch,
    timeout: config.timeoutMs ?? 60_000,
    maxRetries: 1,
  });
  const attempts: string[] = [];
  for (const model of config.models) {
    try {
      const fallback = supportsFallback(model);
      const response = await client.beta.messages.create({
        model,
        max_tokens: 16000,
        system,
        messages: [{ role: 'user', content: user }],
        ...(fallback ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const } : {}),
      });
      if (response.stop_reason === 'refusal') {
        attempts.push(`${model}: refused`);
        continue;
      }
      const text = response.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('');
      if (!text) {
        attempts.push(`${model}: empty response`);
        continue;
      }
      return {
        text,
        model: response.model,
        usage: { promptTokens: response.usage.input_tokens, completionTokens: response.usage.output_tokens },
      };
    } catch (err) {
      // Only the status reaches the user: provider error bodies are not echoed back.
      if (err instanceof Anthropic.RateLimitError || err instanceof Anthropic.InternalServerError) {
        attempts.push(`${model}: HTTP ${err.status}`);
        continue;
      }
      if (err instanceof Anthropic.APIError) {
        attempts.push(`${model}: HTTP ${err.status ?? '?'}`);
        throw new LlmError(`request rejected (HTTP ${err.status ?? '?'})`, attempts);
      }
      attempts.push(`${model}: connection failed`);
    }
  }
  throw new LlmError('all models failed', attempts);
}

/** Models sometimes wrap JSON in a code fence even when asked not to. */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = (fenced ? fenced[1] : text).trim();
  return JSON.parse(candidate);
}
