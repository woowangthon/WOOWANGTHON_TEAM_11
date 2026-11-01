import { Check, ShieldAlert } from 'lucide-react';
import type { FocusCheck, SecurityCheckRule, Task } from '@spec/core';

interface Props {
  /** Checks the AI wrote for this app; shown first. */
  focus: FocusCheck[];
  /** The fixed reference checklist, selected by profile; labelled as fixed text. */
  rules: SecurityCheckRule[];
  tasks: Task[];
  /** When given, each item becomes a checkbox (the board); otherwise a read-only list (the spec). */
  checked?: Record<string, boolean>;
  onToggle?: (key: string) => void;
}

/**
 * Security checks a person does by hand, apart from the difficulty view. What the model wrote
 * for this app and what is fixed reference text are kept in separate, labelled groups, so fixed
 * text is never presented as if it had been generated.
 */
export function SecurityPanel({ focus, rules, tasks, checked, onToggle }: Props) {
  const taskItems = tasks.flatMap((t, i) => t.securityChecks.map((c, j) => ({ key: `${i}:${j}`, task: i + 1, ...c })));
  const Item = ({ k, children }: { k: string; children: React.ReactNode }) =>
    onToggle ? (
      <button role="checkbox" aria-checked={!!checked?.[k]} className={`RuleRow${checked?.[k] ? ' on' : ''}`} onClick={() => onToggle(k)}>
        <span className={`Check${checked?.[k] ? ' on' : ''}`} aria-hidden><Check size={12} strokeWidth={3} /></span>
        <span className="RuleBody">{children}</span>
      </button>
    ) : (
      <div className="RuleRow"><span className="RuleBody">{children}</span></div>
    );

  return (
    <section className="Panel">
      <h3 className="SectionTitle"><ShieldAlert size={17} /> 보안, 직접 확인하세요</h3>
      <p className="CardWhy">AI가 "안전하게 만들었다"고 해도 그대로 믿으면 안 되는 부분입니다. 개발을 몰라도 따라 할 수 있는 확인 방법이에요.</p>

      <div className="Row">
        <h4 className="SubHead">이 앱에서 특히 확인할 것</h4>
        <span className="Badge">AI 판단</span>
      </div>
      {focus.length === 0 && taskItems.length === 0 ? (
        <p className="Empty">AI가 이 앱 전용 확인 항목을 만들지 못했습니다(AI 미사용). 아래 기본 점검만 표시합니다.</p>
      ) : (
        <div className="RuleGroup">
          {focus.map((c, i) => (
            <Item key={`focus:${i}`} k={`focus:${i}`}>
              <span className="RuleTitle">{c.what}</span>
              <ol className="Steps">{c.steps.map((s) => <li key={s}>{s}</li>)}</ol>
            </Item>
          ))}
          {taskItems.map((c) => (
            <Item key={c.key} k={c.key}>
              <span className="RuleTitle">{c.what} <span className="Badge fallback">작업 #{c.task}</span></span>
              <span className="RuleWhy">{c.how}</span>
            </Item>
          ))}
        </div>
      )}

      {rules.length > 0 && (
        <>
          <div className="Row">
            <h4 className="SubHead">기본 점검</h4>
            <span className="Badge fallback">고정 안내문 · 앱 성격에 따라 선택됨</span>
          </div>
          <div className="RuleGroup">
            {rules.map((r) => (
              <Item key={r.id} k={`rule:${r.id}`}>
                <span className="RuleTitle">{r.what}</span>
                <ol className="Steps">{r.steps.map((s) => <li key={s}>{s}</li>)}</ol>
              </Item>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
