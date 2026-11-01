import type { SecurityCheckRule } from './securityChecks.ts';
import type { Difficulty, FocusCheck, Task } from './types.ts';

export const COLUMNS = ['todo', 'doing', 'verify', 'done'] as const;
export type Column = (typeof COLUMNS)[number];

export const COLUMN_LABEL: Record<Column, string> = {
  todo: '할 일',
  doing: '진행 중',
  verify: '사람 확인',
  done: '완료',
};

/** Only what the user changed: a task's column and which checks they ticked. */
export interface BoardState {
  column: Record<number, Column>;
  /** `${taskIndex}:${checkIndex}` for task checks, `rule:${id}` for the project checklist. */
  checked: Record<string, boolean>;
}

export const EMPTY_BOARD: BoardState = { column: {}, checked: {} };

export const columnOf = (state: BoardState, taskIndex: number): Column => state.column[taskIndex] ?? 'todo';

export const taskCheckKey = (taskIndex: number, checkIndex: number) => `${taskIndex}:${checkIndex}`;

/** Unticked human checks blocking a task from "done". The person decides, not the AI. */
export function blockingChecks(state: BoardState, task: Task, taskIndex: number): number {
  return task.securityChecks.filter((_, j) => !state.checked[taskCheckKey(taskIndex, j)]).length;
}

/** Moving to done is refused while a human check is unticked; every other move is free. */
export function moveTask(state: BoardState, tasks: Task[], taskIndex: number, to: Column): BoardState {
  const task = tasks[taskIndex];
  if (!task) throw new Error(`no task #${taskIndex + 1}`);
  if (to === 'done' && blockingChecks(state, task, taskIndex) > 0) {
    throw new Error('사람 확인 항목을 모두 체크해야 완료로 옮길 수 있습니다.');
  }
  return { ...state, column: { ...state.column, [taskIndex]: to } };
}

export function toggleCheck(state: BoardState, key: string): BoardState {
  return { ...state, checked: { ...state.checked, [key]: !state.checked[key] } };
}

/**
 * A stable key for the board in browser storage: the same plan reopens the same board,
 * a different plan starts fresh instead of inheriting someone else's ticks.
 */
export function boardKey(request: string, tasks: Task[]): string {
  const text = `${request}\u0000${tasks.map((t) => t.title).join('\u0000')}`;
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) >>> 0;
  return `board:${h.toString(36)}`;
}

const LEVEL: Record<Difficulty, string> = { easy: '하', medium: '중', hard: '상' };

/** A Markdown checklist that pastes into a GitHub issue, Notion or any tracker. */
export function boardMarkdown(state: BoardState, tasks: Task[], rules: SecurityCheckRule[], focus: FocusCheck[] = []): string {
  const box = (on: boolean) => (on ? '[x]' : '[ ]');
  const lines: string[] = ['## 작업', ''];
  tasks.forEach((t, i) => {
    const col = columnOf(state, i);
    lines.push(`- ${box(col === 'done')} #${i + 1} ${t.title} (난이도 ${LEVEL[t.difficulty]}, ${COLUMN_LABEL[col]})`);
    for (const w of t.watchouts) lines.push(`  - 주의: ${w}`);
    t.securityChecks.forEach((c, j) => lines.push(`  - ${box(!!state.checked[taskCheckKey(i, j)])} 사람 확인: ${c.what}`));
  });
  if (focus.length) {
    lines.push('', '## 이 앱에서 특히 확인할 것 (AI)', '');
    focus.forEach((c, i) => lines.push(`- ${box(!!state.checked[`focus:${i}`])} ${c.what}`));
  }
  if (rules.length) {
    lines.push('', '## 기본 점검 (고정 안내문)', '');
    for (const r of rules) lines.push(`- ${box(!!state.checked[`rule:${r.id}`])} ${r.what}`);
  }
  return lines.join('\n') + '\n';
}
