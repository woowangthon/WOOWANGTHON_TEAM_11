import type { Decision, Rule, Task } from './types.ts';

export type SpecLang = 'en' | 'ko';

export interface SpecInput {
  request: string;
  summary: string;
  decisions: Decision[];
  /** Free text the owner added after the cards; empty when none. */
  notes: string;
  rules: Rule[];
  tasks: Task[];
}

const HEADINGS = {
  en: {
    title: '# Project instructions',
    goal: '## Goal',
    decisions: '## Decisions already made',
    decisionsNote: 'These were decided by the owner. Do not change them; ask if one blocks you.',
    notes: '## Additional notes from the owner',
    engineering: '## Engineering rules',
    security: '## Security rules',
    plan: '## Build plan',
    planNote: 'Work through these in order. Finish and verify one before starting the next.',
    doneWhen: 'Done when',
    style: '## Working style',
    styleLines: [
      '- If a requirement is ambiguous and not covered above, ask one question instead of guessing.',
      '- Do not add features that are not in the goal or the build plan.',
    ],
  },
  ko: {
    title: '# 프로젝트 지시서 (확인용)',
    goal: '## 목표',
    decisions: '## 이미 정한 것',
    decisionsNote: '주인이 정한 내용입니다. 바꾸지 말고, 막히면 질문하세요.',
    notes: '## 주인이 덧붙인 말',
    engineering: '## 유지보수 규칙',
    security: '## 보안 규칙',
    plan: '## 작업 계획',
    planNote: '순서대로 진행하고, 하나를 끝내고 확인한 뒤 다음으로 넘어가세요.',
    doneWhen: '완료 조건',
    style: '## 작업 방식',
    styleLines: [
      '- 위에 없는 애매한 요구사항은 추측하지 말고 질문 하나로 확인하세요.',
      '- 목표와 작업 계획에 없는 기능은 추가하지 마세요.',
    ],
  },
} as const;

/**
 * Builds the instruction file for the coding agent. English is the default because coding
 * agents follow English instructions most reliably and it costs fewer tokens; the Korean
 * version is the owner's review copy. Text fields must already be in the target language
 * (see translatableTexts / withTexts for the English pass).
 */
export function buildSpec(input: SpecInput, lang: SpecLang = 'en'): string {
  const h = HEADINGS[lang];
  const { request, summary, decisions, notes, rules, tasks } = input;
  const section = (category: Rule['category']) =>
    rules.filter((r) => r.category === category).map((r) => `- ${lang === 'en' ? r.instruction : r.instructionKo}`);
  const engineering = section('engineering');
  const security = section('security');

  const lines: string[] = [
    h.title,
    '',
    h.goal,
    request.trim(),
    ...(summary ? ['', summary] : []),
    '',
    h.decisions,
    h.decisionsNote,
    ...decisions.map((d) => `- ${d.question} → **${d.answer}**`),
  ];
  if (notes.trim()) lines.push('', h.notes, notes.trim());
  if (engineering.length) lines.push('', h.engineering, ...engineering);
  if (security.length) lines.push('', h.security, ...security);
  lines.push(
    '',
    h.plan,
    h.planNote,
    ...tasks.map((t, i) => `${i + 1}. ${t.title}${t.done ? `\n   - ${h.doneWhen}: ${t.done}` : ''}`),
    '',
    h.style,
    ...h.styleLines,
  );
  return lines.join('\n') + '\n';
}

/** Every user- or AI-written text in the input, in a fixed order, for translation. */
export function translatableTexts(input: SpecInput): string[] {
  return [
    input.request,
    input.summary,
    input.notes,
    ...input.decisions.flatMap((d) => [d.question, d.answer]),
    ...input.tasks.flatMap((t) => [t.title, t.done]),
  ];
}

/** The inverse of translatableTexts: the same input with each text replaced, in the same order. */
export function withTexts(input: SpecInput, texts: string[]): SpecInput {
  if (texts.length !== translatableTexts(input).length) {
    throw new Error(`expected ${translatableTexts(input).length} texts, got ${texts.length}`);
  }
  let i = 0;
  const next = () => texts[i++];
  return {
    ...input,
    request: next(),
    summary: next(),
    notes: next(),
    decisions: input.decisions.map(() => ({ question: next(), answer: next() })),
    tasks: input.tasks.map(() => ({ title: next(), done: next() })),
  };
}
