import type { Decision, Rule, Task } from './types.ts';

export interface SpecInput {
  request: string;
  summary: string;
  decisions: Decision[];
  rules: Rule[];
  tasks: Task[];
}

/**
 * Builds the instruction file handed to the coding agent. Written in English because
 * coding agents follow English instructions most reliably and it costs fewer tokens;
 * the user's own words (request, decisions) stay as they wrote them.
 */
export function buildSpec(input: SpecInput): string {
  const { request, summary, decisions, rules, tasks } = input;
  const section = (category: Rule['category']) =>
    rules.filter((r) => r.category === category).map((r) => `- ${r.instruction}`);
  const engineering = section('engineering');
  const security = section('security');

  const lines = [
    '# Project instructions',
    '',
    '## Goal',
    request.trim(),
    ...(summary ? ['', summary] : []),
    '',
    '## Decisions already made',
    'These were decided by the owner. Do not change them; ask if one blocks you.',
    ...decisions.map((d) => `- ${d.question} → **${d.answer}**`),
  ];
  if (engineering.length) lines.push('', '## Engineering rules', ...engineering);
  if (security.length) lines.push('', '## Security rules', ...security);
  lines.push(
    '',
    '## Build plan',
    'Work through these in order. Finish and verify one before starting the next.',
    ...tasks.map((t, i) => `${i + 1}. ${t.title}${t.done ? `\n   - Done when: ${t.done}` : ''}`),
    '',
    '## Working style',
    '- If a requirement is ambiguous and not covered above, ask one question instead of guessing.',
    '- Do not add features that are not in the goal or the build plan.',
  );
  return lines.join('\n') + '\n';
}
