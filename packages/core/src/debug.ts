import type { CardsData, FeatureChoice, Plan, Profile } from './types.ts';
import type { Generated } from './service.ts';
import type { TranslateResult } from './translate.ts';

/**
 * One whole run, start to finish, as a single JSON file the owner can hand back for debugging:
 * what they typed, every choice, and every AI answer with its source, model and error. Bug reports
 * used to arrive as a pasted spec cut off by the messenger, with no way to see what led to it.
 *
 * Never holds a key: only which provider and model were used.
 */
export interface DebugRecord {
  kind: 'spec-companion-run';
  version: 1;
  exportedAt: string;
  /** The deployed commit, so a report can be matched to the code that produced it. */
  app: { commit: string };
  ai: { provider: string; model: string };
  request: string;
  cards: Generated<CardsData> | null;
  answers: Record<string, string>;
  custom: Record<string, string>;
  notes: string;
  featureChoices: Record<string, FeatureChoice>;
  ruleOverrides: Record<string, boolean>;
  profile: Profile;
  selectedRuleIds: string[];
  tasks: Generated<Plan> | null;
  translation: TranslateResult | null;
  spec: { en: string; ko: string } | null;
}

export type DebugInput = Omit<DebugRecord, 'kind' | 'version' | 'exportedAt'>;

export function buildDebugRecord(input: DebugInput, now = new Date()): DebugRecord {
  return { kind: 'spec-companion-run', version: 1, exportedAt: now.toISOString(), ...input };
}

/** A file name that sorts by time and says what the run was about. */
export function debugFileName(record: DebugRecord): string {
  const stamp = record.exportedAt.slice(0, 16).replace(/[-:T]/g, '');
  const topic = record.request.replace(/[^\p{L}\p{N}]+/gu, '-').slice(0, 24).replace(/^-|-$/g, '') || 'run';
  return `run-${stamp}-${topic}.json`;
}
