// Shared vocabulary. Card options may only set profile keys listed here, so the
// rule presets (which read the profile) never see a key they do not understand.

export const PROFILE_SCHEMA = {
  platform: ['web', 'mobile', 'desktop', 'cli'],
  auth: ['none', 'email', 'social'],
  storage: ['none', 'local', 'server-db'],
  users: ['single', 'multi'],
  upload: ['no', 'yes'],
  payment: ['no', 'yes'],
  /** Money, fines, points or balances change hands or get calculated, with or without a payment provider. */
  money: ['no', 'yes'],
  externalApi: ['no', 'yes'],
  stage: ['prototype', 'production'],
} as const;

export type ProfileKey = keyof typeof PROFILE_SCHEMA;
export type Profile = { [K in ProfileKey]: (typeof PROFILE_SCHEMA)[K][number] };

// What a project looks like before any card is answered: the smallest thing that runs.
export const DEFAULT_PROFILE: Profile = {
  platform: 'web',
  auth: 'none',
  storage: 'local',
  users: 'single',
  upload: 'no',
  payment: 'no',
  money: 'no',
  externalApi: 'no',
  stage: 'prototype',
};

export interface CardOption {
  id: string;
  label: string;
  detail: string;
  recommended: boolean;
  sets: Partial<Profile>;
  /** For a domain card: the rule this choice fixes, as one sentence for the spec. Empty for tech cards. */
  policy: string;
  /** How much harder this choice makes the build, so cost is visible while choosing. */
  difficulty: Difficulty;
  /** One short line on what makes it that hard; empty when nothing to say. */
  effort: string;
}

/** 'domain' cards settle business rules (who may change a fine); 'tech' cards settle infrastructure. */
export type CardKind = 'domain' | 'tech';

export interface Card {
  id: string;
  kind: CardKind;
  question: string;
  why: string;
  options: CardOption[];
}

/** cardId -> chosen optionId, or CUSTOM_ANSWER when the user typed their own. */
export type Answers = Record<string, string>;

/** cardId -> the user's own answer text, used where Answers holds CUSTOM_ANSWER. */
export type CustomAnswers = Record<string, string>;

export const CUSTOM_ANSWER = 'custom';

/** A card and its chosen option as plain text: what crosses the network after the cards step. */
export interface Decision {
  question: string;
  answer: string;
}

export type RuleCategory = 'engineering' | 'security';

export interface Rule {
  id: string;
  category: RuleCategory;
  title: string;
  /** The line that goes into the coding agent's instruction file. */
  instruction: string;
  /** The same instruction in Korean, for the owner's review copy of the spec. */
  instructionKo: string;
  /** Shown to the user: why this matters for their project. */
  why: string;
  /** Returns the reason it applies, or null when it does not. */
  appliesTo: (p: Profile) => string | null;
}

export interface Recommendation {
  rule: Rule;
  recommended: boolean;
  reason: string | null;
}

export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export interface Task {
  title: string;
  done: string;
  /** An estimate for a vibe-coder working with an AI agent, not a commitment. */
  difficulty: Difficulty;
  /** Why it is that hard, concretely. */
  reason: string;
  /** Problems this task must deal with, so the agent (and the owner) do not skip them. */
  watchouts: string[];
  /** What only a person can judge here, each with how to check it. AI output is not trusted for these. */
  securityChecks: SecurityCheck[];
}

export interface SecurityCheck {
  what: string;
  how: string;
}

export interface StackItem {
  /** Which part of the app, e.g. "화면", "데이터 저장". */
  area: string;
  /** A product or library name; never translated. */
  choice: string;
  /** Its role in this app. */
  why: string;
  /** How it works with the other picks (e.g. which one owns login). */
  connects: string;
}

export const FREE_TIERS = ['full', 'partial', 'none'] as const;

export interface BudgetItem {
  name: string;
  free: string;
  paid: string;
}

/** A rough running-cost estimate at small scale; shown as an estimate, never as a quote. */
export interface Budget {
  freeTier: (typeof FREE_TIERS)[number];
  /** A KRW range, e.g. "0원~1만원". */
  monthly: string;
  summary: string;
  items: BudgetItem[];
}

export interface Plan {
  tasks: Task[];
  stack: StackItem[];
  budget: Budget;
}

/** Where a piece of output came from. Shown in the UI: the contest forbids passing fixed output off as AI output. */
export type Source = 'ai' | 'fallback';
