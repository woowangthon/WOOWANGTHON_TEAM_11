import { chatJson, extractJson } from './llm.ts';
import type { LlmConfig } from './llm.ts';
import type { Source } from './types.ts';

export const MAX_TRANSLATE_LINES = 80;
const MAX_LINE_CHARS = 2000;

const SYSTEM = `Translate each Korean string to concise, plain English for a software developer.
Return JSON only: {"lines": [string, ...]} with exactly as many items as given, in the same order.
Keep code, file names and product names unchanged. An empty string stays empty.`;

export function validateLines(raw: unknown): string[] {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_TRANSLATE_LINES) {
    throw new Error(`lines: expected 1-${MAX_TRANSLATE_LINES} items`);
  }
  return raw.map((l, i) => {
    if (typeof l !== 'string') throw new Error(`lines[${i}]: expected a string`);
    return l.slice(0, MAX_LINE_CHARS);
  });
}

/**
 * One call for the whole spec. On failure the Korean lines come back unchanged with
 * source 'fallback', so the spec is still usable and the UI says it was not translated.
 */
export async function translateToEnglish(
  llm: LlmConfig,
  lines: string[],
): Promise<{ lines: string[]; source: Source; model: string | null; error: string | null }> {
  try {
    const res = await chatJson(llm, SYSTEM, JSON.stringify({ lines }));
    const out = (extractJson(res.text) as { lines?: unknown }).lines;
    if (!Array.isArray(out) || out.length !== lines.length) {
      throw new Error(`translation returned ${Array.isArray(out) ? out.length : 'no'} lines for ${lines.length}`);
    }
    // Empty in, empty out: a model that fills a blank summary would add text nobody wrote.
    const translated = out.map((l, i) => (lines[i].trim() === '' ? '' : String(l)));
    return { lines: translated, source: 'ai', model: res.model, error: null };
  } catch (err) {
    return { lines, source: 'fallback', model: null, error: (err as Error).message };
  }
}
