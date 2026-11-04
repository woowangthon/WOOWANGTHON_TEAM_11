import { Lightbulb } from 'lucide-react';
import type { FeatureChoice, FeatureIdea } from '@spec/core';
import { Dots } from './PlanView.tsx';

const CHOICES: { id: FeatureChoice; label: string }[] = [
  { id: 'now', label: '지금 만들기' },
  { id: 'later', label: '나중에' },
  { id: 'no', label: '필요 없음' },
];

interface Props {
  ideas: FeatureIdea[];
  choices: Record<string, FeatureChoice>;
  onChoose: (id: string, choice: FeatureChoice) => void;
}

/**
 * Features the owner will likely want soon. Deciding now/later up front keeps late additions from
 * bending the structure; "later" ones go into the spec so the coding AI leaves room for them.
 */
export function FeatureIdeas({ ideas, choices, onChoose }: Props) {
  if (ideas.length === 0) return null;
  return (
    <section className="Panel" aria-label="곧 필요해질 기능">
      <div className="Row">
        <h3 className="CardQ"><Lightbulb size={15} /> 곧 필요해질 기능 {ideas.length}개</h3>
        <span className="Spacer" />
        <span className="Badge">AI 제안</span>
      </div>
      <p className="CardWhy">
        요청엔 없지만 쓰다 보면 거의 반드시 찾게 되는 기능이에요. 나중에 덧붙이면 구조가 흔들리니 지금 정해 두세요.
        '나중에'로 두면 지금은 만들지 않고, 코딩 AI가 붙일 자리만 열어 둡니다.
      </p>
      {ideas.map((f) => (
        <div key={f.id} className="Value">
          <div className="Row">
            <span className="ValueHead">{f.name}</span>
            {f.essential && <span className="Rec">필수에 가까움</span>}
            <Dots level={f.difficulty} />
            <span className="Spacer" />
            <div className="Tabs" role="radiogroup" aria-label={f.name}>
              {CHOICES.map((c) => (
                <button
                  key={c.id}
                  role="radio"
                  aria-checked={(choices[f.id] ?? 'later') === c.id}
                  className={`Tab${(choices[f.id] ?? 'later') === c.id ? ' active' : ''}`}
                  onClick={() => onChoose(f.id, c.id)}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          {f.why && <span className="ValueBody">{f.why}</span>}
        </div>
      ))}
    </section>
  );
}
