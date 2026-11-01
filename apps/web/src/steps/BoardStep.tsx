import { useEffect, useState } from 'react';
import { AlertTriangle, ArrowLeft, ArrowRight, Check, ChevronDown, ClipboardCopy, ShieldCheck, SquareKanban } from 'lucide-react';
import {
  COLUMNS,
  COLUMN_LABEL,
  EMPTY_BOARD,
  blockingChecks,
  boardKey,
  boardMarkdown,
  columnOf,
  moveTask,
  securityChecksFor,
  taskCheckKey,
  toggleCheck,
} from '@spec/core';
import type { BoardState, Column, FocusCheck, Profile, Task } from '@spec/core';
import { Dots } from '../ui/PlanView.tsx';
import { SecurityPanel } from '../ui/SecurityPanel.tsx';

const COLUMN_HINT: Record<Column, string> = {
  todo: '아직 시작 전',
  doing: '코딩 AI에게 맡긴 작업',
  verify: '보안 항목을 직접 확인',
  done: '확인까지 끝남',
};

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
  focus: FocusCheck[];
  profile: Profile;
  onBack: () => void;
  onNext: () => void;
}

export function BoardStep({ request, tasks, focus, profile, onBack, onNext }: Props) {
  const key = boardKey(request, tasks);
  const [state, setState] = useState<BoardState>(() => load(key));
  const [open, setOpen] = useState<number | null>(null);
  const [blocked, setBlocked] = useState<number | null>(null);
  const [copied, setCopied] = useState<'ok' | 'fail' | null>(null);
  const rules = securityChecksFor(profile);

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
      setOpen(i);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(boardMarkdown(state, tasks, rules, focus));
      setCopied('ok');
    } catch {
      setCopied('fail');
    }
    setTimeout(() => setCopied(null), 1600);
  }

  const done = tasks.filter((_, i) => columnOf(state, i) === 'done').length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  return (
    <>
      <section className="Panel">
        <div className="Row">
          <h2 className="SectionTitle"><SquareKanban size={18} /> 작업 보드</h2>
          <span className="Spacer" />
          <button className="Btn" onClick={copy}>
            <ClipboardCopy size={14} /> {copied === 'ok' ? '복사됨' : copied === 'fail' ? '복사 실패' : '마크다운 복사'}
          </button>
        </div>
        <div className="Row">
          <span className="Note">진행률 {done} / {tasks.length}</span>
          <span className="Spacer" />
          <span className="Note">보안 확인이 남은 작업은 완료로 옮길 수 없어요 · 이 브라우저에 저장</span>
        </div>
        <div className="Meter"><div className="MeterFill" style={{ width: `${pct}%` }} /></div>
      </section>

      <div className="BoardScroll">
        <div className="Board">
          {COLUMNS.map((col) => {
            const items = tasks.map((t, i) => ({ t, i })).filter(({ i }) => columnOf(state, i) === col);
            return (
              <section key={col} className={`Col${col === 'done' ? ' done' : ''}`} aria-label={COLUMN_LABEL[col]}>
                <header className="ColHead">
                  <span>{COLUMN_LABEL[col]} <span className="ColCount">{items.length}</span></span>
                  <span className="Note">{COLUMN_HINT[col]}</span>
                </header>
                {items.length === 0 && <div className="ColEmpty">비어 있음</div>}
                {items.map(({ t, i }) => {
                  const left = blockingChecks(state, t, i);
                  const total = t.securityChecks.length;
                  const expanded = open === i;
                  const nextCol = COLUMNS[COLUMNS.indexOf(col) + 1];
                  return (
                    <article key={i} className={`BCard${expanded ? ' open' : ''}`}>
                      <button className="BCardMain" onClick={() => setOpen(expanded ? null : i)} aria-expanded={expanded}>
                        <span className="BCardTop">
                          <span className="Note">#{i + 1}</span>
                          <Dots level={t.difficulty} />
                        </span>
                        <span className="BCardTitle">{t.title}</span>
                        <span className="BCardMeta">
                          {t.watchouts.length > 0 && <span className="Meta"><AlertTriangle size={11} /> 주의 {t.watchouts.length}</span>}
                          {total > 0 && (
                            <span className={`Meta${left === 0 ? ' ok' : ''}`}><ShieldCheck size={11} /> 보안 {total - left}/{total}</span>
                          )}
                          <ChevronDown size={13} className="Chevron" />
                        </span>
                      </button>

                      {expanded && (
                        <div className="BCardBody">
                          {t.done && <p className="RuleWhy"><b>완료 조건</b> · {t.done}</p>}
                          {t.watchouts.map((w) => <p key={w} className="RuleWhy">· {w}</p>)}
                          {t.securityChecks.map((c, j) => {
                            const k = taskCheckKey(i, j);
                            const on = !!state.checked[k];
                            return (
                              <button key={k} role="checkbox" aria-checked={on} className="CheckRow" onClick={() => setState(toggleCheck(state, k))}>
                                <span className={`Check${on ? ' on' : ''}`} aria-hidden><Check size={12} strokeWidth={3} /></span>
                                <span><b>{c.what}</b><br /><span className="Note">{c.how}</span></span>
                              </button>
                            );
                          })}
                          {blocked === i && left > 0 && <p className="Note">보안 확인 {left}개를 체크해야 완료로 옮길 수 있어요.</p>}
                        </div>
                      )}

                      <footer className="MoveRow">
                        <button className="MiniBtn" disabled={col === 'todo'} onClick={() => move(i, -1)} aria-label="이전 단계로">
                          <ArrowLeft size={12} />
                        </button>
                        {nextCol && (
                          <button className="MiniBtn" onClick={() => move(i, 1)} aria-label="다음 단계로">
                            {COLUMN_LABEL[nextCol]} <ArrowRight size={12} />
                          </button>
                        )}
                      </footer>
                    </article>
                  );
                })}
              </section>
            );
          })}
        </div>
      </div>

      <SecurityPanel focus={focus} rules={rules} tasks={[]} checked={state.checked} onToggle={(k) => setState(toggleCheck(state, k))} />

      <div className="Row">
        <button className="Btn" onClick={onBack}><ArrowLeft size={15} /> 사양서로</button>
        <span className="Spacer" />
        <button className="Btn primary" onClick={onNext}>만든 코드 점검 <ArrowRight size={15} /></button>
      </div>
    </>
  );
}
