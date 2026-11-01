import { ENGINEERING_RULES } from './presets/engineering.ts';
import { SECURITY_RULES } from './presets/security.ts';
import type { Profile, Recommendation, Rule } from './types.ts';

export const ALL_RULES: Rule[] = [...ENGINEERING_RULES, ...SECURITY_RULES];

/**
 * Rule-based on purpose: the same profile always yields the same recommendation,
 * so a user (or a judge) can see exactly why a rule was switched on.
 */
export function recommendRules(profile: Profile, rules: Rule[] = ALL_RULES): Recommendation[] {
  return rules.map((rule) => {
    const reason = rule.appliesTo(profile);
    return { rule, recommended: reason !== null, reason };
  });
}

export function findRule(id: string, rules: Rule[] = ALL_RULES): Rule {
  const rule = rules.find((r) => r.id === id);
  if (!rule) throw new Error(`unknown rule "${id}"`);
  return rule;
}
