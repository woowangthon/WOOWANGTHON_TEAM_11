import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ClipboardCopy, SquareKanban, ShieldAlert, UserCheck } from 'lucide-react';
import {
  COLUMNS,
  COLUMN_LABEL,
  EMPTY_BOARD,
  blockingChecks,
  boardKey,
  boardMarkdown,
  columnOf,
  humanChecksFor,
  moveTask,
  taskCheckKey,
  toggleCheck,
} from '@spec/core';
import type { BoardState, Profile, Task } from '@spec/core';
import { Dots } from '../ui/PlanView.tsx';

// Per-browser storage is enough: the board belongs to one person working on one plan.
function load(key: string): BoardState {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as BoardState;
  } catch {
    // Unreadable or blocked: start with an empty board.
  }
  return EMPTY_BOARD;
}

interface Props {
  request: string;
  tasks: Task[];
  profile: Profile;
  onBack: () => void;
  onNext: () => void;
}

export function BoardStep({ request, tasks, profile, onBack, onNext }: Props) {
  const key = boardKey(request, tasks);
  const [state, setState] = useState<BoardState>(() => load(key));
  const [blocked, setBlocked] = useState<number | null>(null);
  const [copied, setCopied] = useState<'ok' | 'fail' | null>(null);
  const rules = humanChecksFor(profile);

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      // Not persisted; the board still works for this visit.
    }
  }, [key, state]);

  function move(i: number, step: 1 | -1) {
    const next = COLUMNS[COLUMNS.indexOf(columnOf(state, i)) + step];
    if (!next) return;
    try {
      setState(moveTask(state, tasks, i, next));
      setBlocked(null);
    } catch {
      setBlocked(i);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(boardMarkdown(state, tasks, rules));
      setCopied('ok');
    } catch {
      setCopied('fail');
    }
    setTimeout(() => setCopied(null), 1600);
  }

  const done = tasks.filter((_, i) => columnOf(state, i) === 'done').length;

  return (
    <>
      <section className="Panel">
        <div className="Row">
          <h2 className="SectionTitle"><SquareKanban size={18} /> 작업 보드</h2>
          <span className="Spacer" />
          <span className="Badge">{done} / {tasks.length} 완료</span>
          <button className="Btn" onClick={copy}>
            <ClipboardCopy size={14} /> {copied === 'ok' ? '복사됨' : copied === 'fail' ? '복사 실패' : '마크다운 복사'}
          </button>
        </div>
        <p className="Muted">
          AI가 "다 됐다"고 해도 그대로 믿지 않습니다. <b>사람 확인</b> 항목을 직접 확인하고 체크해야 완료로 옮길 수 있어요.
          보드는 이 브라우저에 저장되고, 마크다운으로 복사하면 GitHub 이슈나 Notion에 그대로 붙습니다.
        </p>
      </section>

      <div className="Board">
        {COLUMNS.map((col) => (
          <section key={col} className="Col" aria-label={COLUMN_LABEL[col]}>
            <div className="ColHead">
              <span>{COLUMN_LABEL[col]}</span>
              <span className="Note">{tasks.filter((_, i) => columnOf(state, i) === col).length}</span>
            </div>
            {tasks.map((t, i) => {
              if (columnOf(state, i) !== col) return null;
              const left = blockingChecks(state, t, i);
              return (
                <article key={i} className="BCard">
                  <div className="Row" style={{ gap: '0.4rem' }}>
                    <span className="Note">#{i + 1}</span>
                    <span className="Spacer" />
                    <Dots level={t.difficulty} />
                  </div>
                  <span className="BCardTitle">{t.title}</span>
                  {t.watchouts.length > 0 && <span className="Note">주의: {t.watchouts.join(' / ')}</span>}
                  {t.humanChecks.map((c, j) => {
                    const on = !!state.checked[taskCheckKey(i, j)];
                    return (
                      <button
                        key={c.what}
                        role="checkbox"
                        aria-checked={on}
                        className="CheckRow"
                        title={c.how}
                        onClick={() => setState(toggleCheck(state, taskCheckKey(i, j)))}
                      >
                        <span className={`Check${on ? ' on' : ''}`} aria-hidden><Check size={12} strokeWidth={3} /></span>
                        <span><UserCheck size={11} /> {c.what}<br /><span className="Note">{c.how}</span></span>
                      </button>
                    );
                  })}
                  {blocked === i && left > 0 && <span className="Note">사람 확인 {left}개를 체크해야 완료로 옮길 수 있어요.</span>}
                  <div className="MoveRow">
                    <button className="MiniBtn" disabled={col === 'todo'} onClick={() => move(i, -1)} aria-label="이전 단계로">
                      <ArrowLeft size={11} />
                    </button>
                    <button className="MiniBtn" disabled={col === 'done'} onClick={() => move(i, 1)} aria-label="다음 단계로">
                      <ArrowRight size={11} />
                    </button>
                  </div>
                </article>
              );
            })}
          </section>
        ))}
      </div>

      <section className="Panel">
        <h3 className="SectionTitle"><ShieldAlert size={17} /> 사람이 직접 확인할 것</h3>
        <p className="CardWhy">AI가 스스로 판단하게 두면 안 되는 항목입니다. 고정된 확인 절차라 AI 답변과 무관하게 그대로 따라 하면 됩니다.</p>
        <div className="RuleGroup">
          {rules.map((r) => {
            const k = `rule:${r.id}`;
            const on = !!state.checked[k];
            return (
              <button key={r.id} role="checkbox" aria-checked={on} className={`RuleRow${on ? ' on' : ''}`} onClick={() => setState(toggleCheck(state, k))}>
                <span className={`Check${on ? ' on' : ''}`} aria-hidden><Check size={12} strokeWidth={3} /></span>
                <span className="RuleBody">
                  <span className="RuleTitle">{r.what}</span>
                  <ol className="Steps">{r.steps.map((s) => <li key={s}>{s}</li>)}</ol>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="Row">
        <button className="Btn" onClick={onBack}><ArrowLeft size={15} /> 사양서로</button>
        <span className="Spacer" />
        <button className="Btn primary" onClick={onNext}>만든 코드 점검 <ArrowRight size={15} /></button>
      </div>
    </>
  );
}
