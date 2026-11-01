import { ArrowLeft, ArrowRight, Check, ShieldCheck, Wrench } from 'lucide-react';
import type { Recommendation, RuleCategory } from '@spec/core';

const GROUPS: { category: RuleCategory; title: string; blurb: string; icon: typeof Wrench }[] = [
  { category: 'engineering', title: '유지보수 규칙', blurb: '스파게티 코드와, 그걸 고치느라 반복되는 요청을 막습니다.', icon: Wrench },
  { category: 'security', title: '보안 규칙', blurb: '바이브코딩 앱에서 실제로 반복된 유출 사고를 막습니다.', icon: ShieldCheck },
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
  const isOn = (r: Recommendation) => overrides[r.rule.id] ?? r.recommended;
  return (
    <>
      <section className="Panel">
        <h2 className="SectionTitle">이 프로젝트에 붙일 규칙</h2>
        <p className="Muted">
          고른 카드를 바탕으로 <b>규칙 기반</b>으로 추천했습니다. AI 판단이 아니라서 같은 선택이면 항상 같은 추천이 나오고,
          추천 이유가 각 규칙 아래에 적혀 있습니다. 켜고 끄는 건 자유입니다.
        </p>
      </section>

      {GROUPS.map(({ category, title, blurb, icon: Icon }) => {
        const items = recommendations.filter((r) => r.rule.category === category);
        const on = items.filter(isOn).length;
        return (
          <section key={category} className="Panel">
            <div className="Row">
              <h3 className="SectionTitle"><Icon size={17} /> {title}</h3>
              <span className="Spacer" />
              <span className="Badge">{on} / {items.length} 적용</span>
            </div>
            <p className="CardWhy">{blurb}</p>
            <div className="RuleGroup">
              {items.map((r) => {
                const active = isOn(r);
                return (
                  <button
                    key={r.rule.id}
                    role="checkbox"
                    aria-checked={active}
                    className={`RuleRow${active ? ' on' : ''}`}
                    onClick={() => onToggle(r.rule.id, !active)}
                  >
                    <span className={`Check${active ? ' on' : ''}`} aria-hidden><Check size={12} strokeWidth={3} /></span>
                    <span className="RuleBody">
                      <span className="RuleTitle">
                        {r.rule.title}
                        {r.recommended && <span className="Rec">추천</span>}
                      </span>
                      <span className="RuleWhy">{r.rule.why}</span>
                      {r.reason && <span className="Note">추천 이유: {r.reason}</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}

      <div className="Row">
        <button className="Btn" onClick={onBack}><ArrowLeft size={15} /> 카드 다시 보기</button>
        <span className="Spacer" />
        <button className="Btn primary" onClick={onNext} disabled={busy}>
          {busy ? '작업 계획 세우고 번역하는 중…' : <>사양서 만들기 <ArrowRight size={15} /></>}
        </button>
      </div>
    </>
  );
}
