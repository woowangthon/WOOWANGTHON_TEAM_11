import { DIFFICULTIES } from './types.ts';
import type { Difficulty, FeatureChoice, FeatureIdea } from './types.ts';

// From the owner's own project: about half of what got added later was close to essential, or
// something an AI could have predicted on day one. Each late addition bent the structure a little.
export const MAX_FEATURES = 6;

/** A malformed idea is dropped on its own; ideas never decide whether the cards survive. */
export function parseFeatures(raw: unknown): FeatureIdea[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: FeatureIdea[] = [];
  for (const f of raw) {
    if (out.length === MAX_FEATURES) break;
    const o = (f ?? {}) as Record<string, unknown>;
    const name = typeof o.name === 'string' ? o.name.trim().slice(0, 60) : '';
    if (!name || seen.has(name)) continue;
    seen.add(name);
    out.push({
      id: `f${out.length + 1}`,
      name,
      why: typeof o.why === 'string' ? o.why.trim().slice(0, 160) : '',
      difficulty: DIFFICULTIES.includes(o.difficulty as Difficulty) ? (o.difficulty as Difficulty) : 'medium',
      essential: o.essential === true,
    });
  }
  return out;
}

/** Essential ideas start as "now", the rest as "later": the owner only changes what they disagree with. */
export function defaultFeatureChoices(ideas: FeatureIdea[]): Record<string, FeatureChoice> {
  return Object.fromEntries(ideas.map((f) => [f.id, f.essential ? 'now' : 'later']));
}

/** Chosen features as sentences: "now" ones are built, "later" ones get room in the structure. */
export interface ChosenFeatures {
  now: string[];
  later: string[];
}

/** The chosen ideas as sentences for the plan and the spec; dropped ones disappear entirely. */
export function splitFeatures(ideas: FeatureIdea[], choices: Record<string, FeatureChoice>): ChosenFeatures {
  const line = (f: FeatureIdea) => (f.why ? `${f.name}: ${f.why}` : f.name);
  return {
    now: ideas.filter((f) => (choices[f.id] ?? 'later') === 'now').map(line),
    later: ideas.filter((f) => (choices[f.id] ?? 'later') === 'later').map(line),
  };
}
