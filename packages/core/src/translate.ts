import { chatParsed } from './llm.ts';
import type { LlmConfig } from './llm.ts';
import type { Source } from './types.ts';

// A full plan (nine decisions, eight tasks with watch-outs and checks, the stack) runs past 80 texts;
// at the old limit of 80 a big spec was refused outright instead of translated.
export const MAX_TRANSLATE_LINES = 200;
const HANGUL = /[가-힣]/;
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

async function translateOnce(llm: LlmConfig, lines: string[]): Promise<{ lines: string[]; model: string }> {
  const res = await chatParsed(llm, SYSTEM, JSON.stringify({ lines }), (raw) => {
    const out = (raw as { lines?: unknown }).lines;
    if (!Array.isArray(out) || out.length !== lines.length) {
      throw new Error(`translation returned ${Array.isArray(out) ? out.length : 'no'} lines for ${lines.length}`);
    }
    return out;
  });
  // Empty in, empty out: a model that fills a blank summary would add text nobody wrote.
  return { lines: res.data.map((l, i) => (lines[i].trim() === '' ? '' : String(l))), model: res.model };
}

export interface TranslateResult {
  lines: string[];
  source: Source;
  model: string | null;
  error: string | null;
  /** How many lines are still Korean after the retry. Shown, so a half-English spec is never silent. */
  untranslated: number;
}

/**
 * One call for the whole spec, then one more for any line the model handed back still in Korean
 * (it does that now and then, and the line count still matches, so nothing used to notice).
 * On failure the Korean lines come back unchanged with source 'fallback'; the spec still works
 * and the UI says it was not translated.
 */
export async function translateToEnglish(llm: LlmConfig, lines: string[]): Promise<TranslateResult> {
  let first: { lines: string[]; model: string };
  try {
    first = await translateOnce(llm, lines);
  } catch (err) {
    const untranslated = lines.filter((l) => HANGUL.test(l)).length;
    return { lines, source: 'fallback', model: null, error: (err as Error).message, untranslated };
  }
  const out = [...first.lines];
  const left = out.flatMap((l, i) => (HANGUL.test(l) ? [i] : []));
  if (left.length > 0) {
    try {
      const again = await translateOnce(llm, left.map((i) => lines[i]));
      left.forEach((i, k) => { out[i] = again.lines[k]; });
    } catch {
      // The first pass stands; what is still Korean is counted below and shown.
    }
  }
  const untranslated = out.filter((l) => HANGUL.test(l)).length;
  return { lines: out, source: 'ai', model: first.model, error: null, untranslated };
}
