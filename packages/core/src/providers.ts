import { GEMINI_OPENAI_BASE } from './llm.ts';
import type { LlmConfig } from './llm.ts';

/**
 * Providers a user may bring their own key for. The base URL is fixed here and never
 * taken from the request: a client-chosen URL would let anyone point the server (and the
 * key it forwards) at a host of their choosing.
 */
export const PROVIDERS = {
  gemini: { label: 'Google Gemini', kind: 'openai-compatible', baseUrl: GEMINI_OPENAI_BASE, models: ['gemini-flash-lite-latest', 'gemini-flash-latest'] },
  anthropic: { label: 'Anthropic Claude', kind: 'anthropic', baseUrl: 'https://api.anthropic.com', models: ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5'] },
  openai: { label: 'OpenAI', kind: 'openai-compatible', baseUrl: 'https://api.openai.com/v1', models: [] },
} as const satisfies Record<string, { label: string; kind: LlmConfig['kind']; baseUrl: string; models: readonly string[] }>;

export type ProviderId = keyof typeof PROVIDERS;

export interface ByokInput {
  provider: string | null;
  key: string | null;
  model: string | null;
}

// Keys from all three providers are long runs of these characters; anything else
// (spaces, quotes, newlines) is a paste mistake or an injection attempt.
const KEY_PATTERN = /^[A-Za-z0-9_\-.]{20,200}$/;
const MODEL_PATTERN = /^[a-z0-9][a-z0-9.\-]{1,63}$/i;

/** Returns null when no key was sent (use the server's own key), a config when valid, or throws. */
export function byokConfig(input: ByokInput): LlmConfig | null {
  if (!input.key && !input.provider) return null;
  if (!input.provider || !Object.hasOwn(PROVIDERS, input.provider)) throw new Error('지원하지 않는 AI 제공자입니다.');
  if (!input.key || !KEY_PATTERN.test(input.key)) throw new Error('API 키 형식이 올바르지 않습니다.');
  const provider = PROVIDERS[input.provider as ProviderId];
  if (input.model && !MODEL_PATTERN.test(input.model)) throw new Error('모델 이름 형식이 올바르지 않습니다.');
  const models = input.model ? [input.model] : [...provider.models];
  if (models.length === 0) throw new Error(`${provider.label}는 사용할 모델 이름을 입력해야 합니다.`);
  return { kind: provider.kind, baseUrl: provider.baseUrl, apiKey: input.key, models };
}
