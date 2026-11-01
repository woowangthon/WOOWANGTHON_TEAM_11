import { Check, ShieldAlert } from 'lucide-react';
import type { SecurityCheckRule, Task } from '@spec/core';

interface Props {
  rules: SecurityCheckRule[];
  tasks: Task[];
  /** When given, each item becomes a checkbox (the board); otherwise a read-only list (the spec). */
  checked?: Record<string, boolean>;
  onToggle?: (key: string) => void;
}

/**
 * Security checks a person does by hand, kept apart from the difficulty view: the fixed
 * checklist first (trusted text), then the task-specific ones the AI flagged.
 */
export function SecurityPanel({ rules, tasks, checked, onToggle }: Props) {
  const taskItems = tasks.flatMap((t, i) => t.securityChecks.map((c, j) => ({ key: `${i}:${j}`, task: i + 1, ...c })));
  const box = (key: string) =>
    onToggle && (
      <span className={`Check${checked?.[key] ? ' on' : ''}`} aria-hidden>
        <Check size={12} strokeWidth={3} />
      </span>
    );
  const Item = ({ k, children }: { k: string; children: React.ReactNode }) =>
    onToggle ? (
      <button role="checkbox" aria-checked={!!checked?.[k]} className={`RuleRow${checked?.[k] ? ' on' : ''}`} onClick={() => onToggle(k)}>
        {box(k)}
        <span className="RuleBody">{children}</span>
      </button>
    ) : (
      <div className="RuleRow"><span className="RuleBody">{children}</span></div>
    );

  return (
    <section className="Panel">
      <h3 className="SectionTitle"><ShieldAlert size={17} /> 보안, 직접 확인하세요</h3>
      <p className="CardWhy">
        AI가 "안전하게 만들었다"고 해도 그대로 믿으면 안 되는 부분입니다. 개발을 몰라도 따라 할 수 있는 확인 방법이에요.
      </p>
      {rules.length === 0 && taskItems.length === 0 && (
        <p className="Empty">이 앱은 키·개인정보·결제를 다루지 않아 따로 확인할 보안 항목이 없습니다.</p>
      )}
      <div className="RuleGroup">
        {rules.map((r) => (
          <Item key={r.id} k={`rule:${r.id}`}>
            <span className="RuleTitle">{r.what}</span>
            <ol className="Steps">{r.steps.map((s) => <li key={s}>{s}</li>)}</ol>
          </Item>
        ))}
        {taskItems.map((c) => (
          <Item key={c.key} k={c.key}>
            <span className="RuleTitle">{c.what} <span className="Badge fallback">작업 #{c.task} · AI 판단</span></span>
            <span className="RuleWhy">{c.how}</span>
          </Item>
        ))}
      </div>
    </section>
  );
}
