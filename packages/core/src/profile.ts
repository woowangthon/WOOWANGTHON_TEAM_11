import { CUSTOM_ANSWER, DEFAULT_PROFILE, PROFILE_SCHEMA } from './types.ts';
import type { Answers, Card, CustomAnswers, Decision, Profile, ProfileKey } from './types.ts';

export function isProfileKey(key: string): key is ProfileKey {
  return Object.hasOwn(PROFILE_SCHEMA, key);
}

export function isProfileValue(key: ProfileKey, value: string): boolean {
  return (PROFILE_SCHEMA[key] as readonly string[]).includes(value);
}

/**
 * The profile is derived from the answers every time, never stored next to them,
 * so changing one card can never leave a stale flag behind.
 * Cards are applied in order; a later card that sets the same key wins.
 */
export function deriveProfile(cards: Card[], answers: Answers): Profile {
  const profile: Profile = { ...DEFAULT_PROFILE };
  for (const card of cards) {
    const chosen = answers[card.id];
    if (chosen === undefined) continue;
    // A typed answer cannot be mapped to profile values. Falling back to the defaults would
    // quietly drop rules (typing "admin logs in with a password" would read as "no login"),
    // so it counts as the card's recommended option; the user can still toggle rules.
    const option =
      chosen === CUSTOM_ANSWER
        ? (card.options.find((o) => o.recommended) ?? card.options[0])
        : card.options.find((o) => o.id === chosen);
    if (!option) throw new Error(`answer "${chosen}" is not an option of card "${card.id}"`);
    Object.assign(profile, option.sets);
  }
  // Accounts only exist to tell users apart. The model often sets `auth` without `users`,
  // and leaving `users: single` would switch off the server-side permission rule.
  if (profile.auth !== 'none') profile.users = 'multi';
  // Taking payments always means handling money, even if no card said so.
  if (profile.payment === 'yes') profile.money = 'yes';
  return profile;
}

export const MAX_CUSTOM_ANSWER_CHARS = 120;

export function toDecisions(cards: Card[], answers: Answers, custom: CustomAnswers = {}): Decision[] {
  return cards.map((card) => {
    if (answers[card.id] === CUSTOM_ANSWER) {
      const text = custom[card.id]?.trim();
      if (!text) throw new Error(`"${card.question}"에 직접 입력한 답이 비어 있습니다.`);
      return { question: card.question, answer: text.slice(0, MAX_CUSTOM_ANSWER_CHARS) };
    }
    const option = card.options.find((o) => o.id === answers[card.id]);
    if (!option) throw new Error(`card "${card.id}" has no answer`);
    return { question: card.question, answer: option.label };
  });
}

/**
 * The business rules the owner settled on domain cards, one sentence each, for the spec.
 * A typed answer is the rule itself; an unanswered domain card adds nothing.
 */
export function toDomainRules(cards: Card[], answers: Answers, custom: CustomAnswers = {}): string[] {
  return cards.flatMap((card) => {
    if (card.kind !== 'domain') return [];
    const chosen = answers[card.id];
    if (chosen === CUSTOM_ANSWER) {
      const text = custom[card.id]?.trim();
      return text ? [`${card.question} → ${text}`] : [];
    }
    const option = card.options.find((o) => o.id === chosen);
    return option ? [option.policy || `${card.question} → ${option.label}`] : [];
  });
}

/** Validates a profile that arrived from a client. */
export function parseProfile(raw: unknown): Profile {
  if (typeof raw !== 'object' || raw === null) throw new Error('profile: expected an object');
  const obj = raw as Record<string, unknown>;
  const profile = { ...DEFAULT_PROFILE } as Record<ProfileKey, string>;
  for (const key of Object.keys(PROFILE_SCHEMA) as ProfileKey[]) {
    const value = obj[key];
    if (typeof value !== 'string' || !isProfileValue(key, value)) throw new Error(`profile.${key}: invalid value`);
    profile[key] = value;
  }
  return profile as Profile;
}

/** Answers that pick each card's recommended option, so a user who agrees with everything clicks nothing. */
export function recommendedAnswers(cards: Card[]): Answers {
  const answers: Answers = {};
  for (const card of cards) {
    const option = card.options.find((o) => o.recommended) ?? card.options[0];
    if (option) answers[card.id] = option.id;
  }
  return answers;
}
