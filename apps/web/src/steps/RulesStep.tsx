import type { Recommendation, RuleCategory } from '@spec/core';

const GROUPS: { category: RuleCategory; title: string; blurb: string }[] = [
  { category: 'engineering', title: '유지보수 규칙', blurb: '스파게티 코드와 반복 수정(토큰 낭비)을 막습니다.' },
  { category: 'security', title: '보안 규칙', blurb: '바이브코딩 앱에서 자주 터지는 사고를 막습니다.' },
];

interface Props {
  recommendations: Recommendation[];
  overrides: Record<string, boolean>;
  onToggle: (id: string, on: boolean) => void;
  onBack: () => void;
  onNext: () => void;
  busy: boolean;
}

export function RulesStep({ recommendations, overrides, onToggle, onBack, onNext, busy }: Props) {
  return (
    <>
      <section className="Panel">
        <h2 className="SectionTitle">이 프로젝트에 필요한 규칙</h2>
        <p className="Muted">고른 카드를 바탕으로 규칙 기반으로 추천했습니다. 같은 선택이면 항상 같은 추천이 나옵니다.</p>
      </section>

      {GROUPS.map((g) => (
        <section key={g.category} className="Panel">
          <h3 className="CardQ">{g.title}</h3>
          <p className="CardWhy">{g.blurb}</p>
          <div className="RuleGroup">
            {recommendations
              .filter((r) => r.rule.category === g.category)
              .map(({ rule, recommended, reason }) => {
                const on = overrides[rule.id] ?? recommended;
                return (
                  <button
                    key={rule.id}
                    role="checkbox"
                    aria-checked={on}
                    className={`RuleRow${on ? ' on' : ''}`}
                    onClick={() => onToggle(rule.id, !on)}
                  >
                    <span className={`Check${on ? ' on' : ''}`} aria-hidden>✓</span>
                    <span className="RuleBody">
                      <span className="RuleTitle">
                        {rule.title}
                        {recommended && <span className="Rec">추천</span>}
                      </span>
                      <span className="RuleWhy">{rule.why}</span>
                      {reason && <span className="Note">추천 이유: {reason}</span>}
                    </span>
                  </button>
                );
              })}
          </div>
        </section>
      ))}

      <div className="Row">
        <button className="Btn" onClick={onBack}>← 카드 다시 보기</button>
        <span className="Spacer" />
        <button className="Btn primary" onClick={onNext} disabled={busy}>
          {busy ? '작업 계획 세우는 중…' : '사양서 만들기 →'}
        </button>
      </div>
    </>
  );
}
