// Reads a run exported from the app's "이번 실행 기록" panel and prints what usually matters
// when something looks wrong: where each step's answer came from, the verdict, the profile the
// rules were picked from, and answers that look accidentally duplicated.
//
//   node --experimental-strip-types --no-warnings scripts/inspect-run.ts run-....json
import { readFileSync } from 'node:fs';
import type { DebugRecord } from '../packages/core/src/index.ts';

const file = process.argv[2];
if (!file) throw new Error('usage: inspect-run.ts <exported run .json>');
const run = JSON.parse(readFileSync(file, 'utf8')) as DebugRecord;
if (run.kind !== 'spec-companion-run') throw new Error(`${file} is not an exported run`);

const step = (name: string, g: { source: string; model: string | null; error: string | null } | null) =>
  console.log(`${name.padEnd(10)} ${g ? `${g.source}${g.model ? ` (${g.model})` : ''}${g.error ? ` — ${g.error}` : ''}` : '(not reached)'}`);

console.log(`commit ${run.app.commit} · ${run.exportedAt} · AI ${run.ai.provider}${run.ai.model ? `/${run.ai.model}` : ''}`);
console.log(`request: ${run.request}\n`);
step('cards', run.cards);
step('plan', run.tasks);
step('translate', run.translation);

const f = run.cards?.data.feasibility;
console.log(`\nverdict  ${f ? `${f.tier} / goal ${f.goal} (${f.by})${f.raisedBy ? ' raised by rule' : ''}` : '(none)'}`);
const b = run.tasks?.data.budget;
if (b) console.log(`budget   ${b.monthly} · free tier ${b.freeTier} · assumed ${b.assumedScale}`);
console.log(`profile  ${Object.entries(run.profile).map(([k, v]) => `${k}=${v}`).join(' ')}`);
console.log(`rules    ${run.selectedRuleIds.join(', ')}`);

// Two cards ending up with the same answer text usually means one answer was meant for one card.
const cards = run.cards?.data.cards ?? [];
const answerOf = (id: string) =>
  run.answers[id] === 'custom' ? run.custom[id] ?? '' : cards.find((c) => c.id === id)?.options.find((o) => o.id === run.answers[id])?.label ?? '';
const seen = new Map<string, string>();
for (const c of cards) {
  const a = answerOf(c.id).trim();
  if (!a) continue;
  if (seen.has(a)) console.log(`\n! same answer on "${seen.get(a)}" and "${c.question}": ${a}`);
  else seen.set(a, c.question);
}
