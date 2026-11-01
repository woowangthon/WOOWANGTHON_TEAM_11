import { DEFAULT_PROFILE, PROFILE_SCHEMA } from './types.ts';
import type { Answers, Card, Profile, ProfileKey } from './types.ts';

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
    const option = card.options.find((o) => o.id === chosen);
    if (!option) throw new Error(`answer "${chosen}" is not an option of card "${card.id}"`);
    Object.assign(profile, option.sets);
  }
  // Accounts only exist to tell users apart. The model often sets `auth` without `users`,
  // and leaving `users: single` would switch off the server-side permission rule.
  if (profile.auth !== 'none') profile.users = 'multi';
  return profile;
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
