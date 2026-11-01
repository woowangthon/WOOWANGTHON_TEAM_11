// Shared vocabulary. Card options may only set profile keys listed here, so the
// rule presets (which read the profile) never see a key they do not understand.

export const PROFILE_SCHEMA = {
  platform: ['web', 'mobile', 'desktop', 'cli'],
  auth: ['none', 'email', 'social'],
  storage: ['none', 'local', 'server-db'],
  users: ['single', 'multi'],
  upload: ['no', 'yes'],
  payment: ['no', 'yes'],
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
  externalApi: 'no',
  stage: 'prototype',
};

export interface CardOption {
  id: string;
  label: string;
  detail: string;
  recommended: boolean;
  sets: Partial<Profile>;
}

export interface Card {
  id: string;
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
  /** One line on why it is that hard. */
  reason: string;
}

export interface StackItem {
  /** Which part of the app, e.g. "화면", "데이터 저장". */
  area: string;
  /** A product or library name; never translated. */
  choice: string;
  why: string;
}

export interface Plan {
  tasks: Task[];
  stack: StackItem[];
}

/** Where a piece of output came from. Shown in the UI: the contest forbids passing fixed output off as AI output. */
export type Source = 'ai' | 'fallback';
