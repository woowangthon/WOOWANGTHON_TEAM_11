import { Gauge, Layers } from 'lucide-react';
import type { Difficulty, Generated, Plan } from '@spec/core';
import { SourceBadge } from './SourceBadge.tsx';

const LEVEL: Record<Difficulty, { label: string; dots: number }> = {
  easy: { label: '하', dots: 1 },
  medium: { label: '중', dots: 2 },
  hard: { label: '상', dots: 3 },
};

// Difficulty is shown as filled dots (intensity), not colours, per the monotone system.
function Dots({ level }: { level: Difficulty }) {
  return (
    <span className="Dots" aria-label={`난이도 ${LEVEL[level].label}`}>
      {[1, 2, 3].map((i) => <span key={i} className={`Dot${i <= LEVEL[level].dots ? ' on' : ''}`} />)}
      <span className="DotLabel">{LEVEL[level].label}</span>
    </span>
  );
}

export function PlanView({ result }: { result: Generated<Plan> }) {
  const { tasks, stack } = result.data;
  const count = (d: Difficulty) => tasks.filter((t) => t.difficulty === d).length;
  return (
    <>
      <section className="Panel">
        <div className="Row">
          <h3 className="SectionTitle"><Gauge size={17} /> 작업 계획과 난이도</h3>
          <span className="Spacer" />
          <SourceBadge result={result} />
        </div>
        <p className="Note">난이도는 AI가 "비개발자가 코딩 AI와 함께 할 때" 기준으로 추정한 값입니다. 약속이 아니라 참고용이에요.</p>
        <div className="Stats" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
          {(['easy', 'medium', 'hard'] as const).map((d) => (
            <div key={d} className="Stat"><span className="StatNum">{count(d)}</span><span className="StatLabel">난이도 {LEVEL[d].label}</span></div>
          ))}
        </div>
        <ol className="Issues">
          {tasks.map((t, i) => (
            <li key={i} className="Issue">
              <span className="IssueNum">#{i + 1}</span>
              <span className="RuleBody">
                <span className="RuleTitle">{t.title}</span>
                {t.done && <span className="RuleWhy">완료 조건: {t.done}</span>}
                {t.reason && <span className="Note">{t.reason}</span>}
              </span>
              <Dots level={t.difficulty} />
            </li>
          ))}
        </ol>
      </section>

      {stack.length > 0 && (
        <section className="Panel">
          <div className="Row">
            <h3 className="SectionTitle"><Layers size={17} /> 추천 기술 스택</h3>
            <span className="Spacer" />
            <SourceBadge result={result} />
          </div>
          <div className="StackGrid">
            {stack.map((s) => (
              <div key={`${s.area}:${s.choice}`} className="Value">
                <span className="Note">{s.area}</span>
                <span className="ValueHead">{s.choice}</span>
                {s.why && <span className="ValueBody">{s.why}</span>}
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
