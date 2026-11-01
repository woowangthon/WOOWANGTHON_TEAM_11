import { chatJson, extractJson } from './llm.ts';
import type { LlmConfig } from './llm.ts';
import type { Rule, Source } from './types.ts';

export const MAX_CODE_CHARS = 40_000;

export type Verdict = 'violation' | 'ok' | 'unclear';

export interface Finding {
  ruleId: string;
  verdict: Verdict;
  evidence: string;
  fix: string;
  /** 'rule' = a deterministic check found it; 'ai' = the model judged it. Shown to the user. */
  by: 'rule' | 'ai';
}

// Deterministic checks for the few rules a pattern can decide. They run even when the AI
// is unavailable, and a rule-found violation is never overridden by the model's opinion.
const STATIC: Record<string, (code: string) => Omit<Finding, 'ruleId' | 'by'> | null> = {
  'sec-secrets': (code) => {
    const m = code.match(/(api[_-]?key|secret|password|token)\s*[:=]\s*['"][A-Za-z0-9_\-.]{12,}['"]/i);
    return m
      ? { verdict: 'violation', evidence: m[0].slice(0, 80), fix: '이 값을 환경변수로 옮기고 .env는 .gitignore에 넣으세요.' }
      : null;
  },
  'eng-no-silent-failure': (code) => {
    const m = code.match(/catch\s*(\([^)]*\))?\s*\{\s*\}/);
    return m ? { verdict: 'violation', evidence: m[0], fix: '오류를 화면에 보여주거나 기록하거나 다시 던지세요.' } : null;
  },
  'eng-file-size': (code) => {
    // Files are separated by "=== path ===" headers (the format the spec asks agents to use);
    // without headers the whole paste is treated as one file.
    const parts = code.split(/^=== (.+) ===$/m);
    const files: { name: string; lines: number }[] = [];
    if (parts.length === 1) files.push({ name: '(붙여넣은 코드)', lines: code.split('\n').length });
    for (let i = 1; i < parts.length; i += 2) files.push({ name: parts[i], lines: parts[i + 1].split('\n').length });
    const long = files.filter((f) => f.lines > 300);
    return long.length
      ? { verdict: 'violation', evidence: long.map((f) => `${f.name}: ${f.lines}줄`).join(', '), fix: '책임별로 파일을 나누세요.' }
      : null;
  },
};

export function staticFindings(code: string, rules: Rule[]): Finding[] {
  const out: Finding[] = [];
  for (const rule of rules) {
    const hit = STATIC[rule.id]?.(code);
    if (hit) out.push({ ...hit, ruleId: rule.id, by: 'rule' });
  }
  return out;
}

export const REVIEW_SYSTEM = `You review code against a fixed list of rules. For each rule, decide whether the code breaks it.
Return JSON only: {"findings": [{"ruleId": string, "verdict": "violation" | "ok" | "unclear", "evidence": string, "fix": string}]}
- One entry per rule id given, no other ids.
- "evidence": the shortest code excerpt or file name that supports the verdict (empty if ok).
- "fix": one sentence in Korean telling the coding agent what to change (empty if ok).
- Use "unclear" when the code shown is not enough to tell. Do not guess "violation".`;

export function parseFindings(raw: unknown, ruleIds: Set<string>): Finding[] {
  const list = (raw as Record<string, unknown> | null)?.findings;
  if (!Array.isArray(list)) throw new Error('findings: expected an array');
  const seen = new Set<string>();
  const out: Finding[] = [];
  for (const [i, f] of list.entries()) {
    const item = f as Record<string, unknown>;
    const ruleId = String(item?.ruleId ?? '');
    // An id we did not send cannot be shown against a rule; reject the whole answer rather than drop it quietly.
    if (!ruleIds.has(ruleId)) throw new Error(`findings[${i}]: unknown rule "${ruleId}"`);
    if (seen.has(ruleId)) continue;
    seen.add(ruleId);
    const verdict = item.verdict === 'violation' || item.verdict === 'ok' ? item.verdict : 'unclear';
    out.push({
      ruleId,
      verdict,
      evidence: typeof item.evidence === 'string' ? item.evidence.slice(0, 200) : '',
      fix: typeof item.fix === 'string' ? item.fix.slice(0, 200) : '',
      by: 'ai',
    });
  }
  return out;
}

/** Rule-found violations win; the model fills in every rule a pattern cannot decide. */
export function mergeFindings(fromRules: Finding[], fromAi: Finding[]): Finding[] {
  const byRule = new Map(fromRules.map((f) => [f.ruleId, f]));
  for (const f of fromAi) if (!byRule.has(f.ruleId)) byRule.set(f.ruleId, f);
  return [...byRule.values()];
}

export async function reviewCode(
  llm: LlmConfig,
  code: string,
  rules: Rule[],
): Promise<{ findings: Finding[]; source: Source; model: string | null; error: string | null }> {
  const fromRules = staticFindings(code, rules);
  const list = rules.map((r) => `- ${r.id}: ${r.instruction}`).join('\n');
  try {
    const res = await chatJson(llm, REVIEW_SYSTEM, `Rules:\n${list}\n\nCode:\n${code}`);
    const fromAi = parseFindings(extractJson(res.text), new Set(rules.map((r) => r.id)));
    return { findings: mergeFindings(fromRules, fromAi), source: 'ai', model: res.model, error: null };
  } catch (err) {
    return { findings: fromRules, source: 'fallback', model: null, error: (err as Error).message };
  }
}

/** The follow-up message for the coding agent, containing only the findings the user chose. */
export function buildFixPrompt(findings: Finding[], rules: Rule[]): string {
  if (findings.length === 0) throw new Error('no findings selected');
  const title = (id: string) => rules.find((r) => r.id === id)?.title ?? id;
  return [
    'Fix the following issues in the code you wrote. Change nothing else.',
    '',
    ...findings.map(
      (f, i) => `${i + 1}. [${title(f.ruleId)}] ${f.fix}${f.evidence ? `\n   Where: ${f.evidence}` : ''}`,
    ),
    '',
    'After fixing, list what you changed, one line per issue.',
  ].join('\n') + '\n';
}

export function validateCode(code: unknown): string {
  if (typeof code !== 'string' || !code.trim()) throw new Error('점검할 코드를 붙여넣어 주세요.');
  if (code.length > MAX_CODE_CHARS) throw new Error(`코드는 ${MAX_CODE_CHARS.toLocaleString()}자 이내로 붙여넣어 주세요.`);
  return code;
}
