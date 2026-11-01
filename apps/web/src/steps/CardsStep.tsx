import type { Answers, Card, Generated } from '@spec/core';
import { SourceBadge } from '../ui/SourceBadge.tsx';

interface Props {
  result: Generated<{ summary: string; cards: Card[] }>;
  answers: Answers;
  onAnswer: (cardId: string, optionId: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export function CardsStep({ result, answers, onAnswer, onBack, onNext }: Props) {
  const { summary, cards } = result.data;
  return (
    <>
      <section className="Panel">
        <div className="Row">
          <h2 className="SectionTitle">해석이 갈리는 지점 {cards.length}개</h2>
          <span className="Spacer" />
          <SourceBadge result={result} />
        </div>
        {summary && <p className="Muted">{summary}</p>}
        <p className="Note">추천안이 미리 선택돼 있습니다. 다르게 하고 싶은 카드만 바꾸세요.</p>
      </section>

      {cards.map((card) => (
        <section key={card.id} className="Panel Card">
          <h3 className="CardQ">{card.question}</h3>
          {card.why && <p className="CardWhy">정하지 않으면: {card.why}</p>}
          <div className="Options" role="radiogroup" aria-label={card.question}>
            {card.options.map((o) => {
              const selected = answers[card.id] === o.id;
              return (
                <button
                  key={o.id}
                  role="radio"
                  aria-checked={selected}
                  className={`Option${selected ? ' selected' : ''}`}
                  onClick={() => onAnswer(card.id, o.id)}
                >
                  <span className="OptionLabel">
                    {o.label}
                    {o.recommended && <span className="Rec">추천</span>}
                  </span>
                  {o.detail && <span className="OptionDetail">{o.detail}</span>}
                </button>
              );
            })}
          </div>
        </section>
      ))}

      <div className="Row">
        <button className="Btn" onClick={onBack}>← 요청 고치기</button>
        <span className="Spacer" />
        <button className="Btn primary" onClick={onNext}>규칙 고르기 →</button>
      </div>
    </>
  );
}
