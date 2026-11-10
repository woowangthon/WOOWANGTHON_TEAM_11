import { useState } from 'react';
import { AlertTriangle, ArrowLeft, ArrowRight, Cpu, PenLine, Scale } from 'lucide-react';
import { CUSTOM_ANSWER, MAX_CUSTOM_ANSWER_CHARS, MAX_NOTES_CHARS } from '@spec/core';
import type { Answers, Card, CardKind, CardsData, CustomAnswers, FeatureChoice, Generated } from '@spec/core';
import { SourceBadge } from '../ui/SourceBadge.tsx';
import { Dots } from '../ui/PlanView.tsx';
import { FeasibilityPanel } from '../ui/FeasibilityPanel.tsx';
import { FeatureIdeas } from '../ui/FeatureIdeas.tsx';

interface Props {
  result: Generated<CardsData>;
  answers: Answers;
  custom: CustomAnswers;
  notes: string;
  featureChoices: Record<string, FeatureChoice>;
  onFeature: (id: string, choice: FeatureChoice) => void;
  onAnswer: (cardId: string, optionId: string) => void;
  onCustom: (cardId: string, text: string) => void;
  onNotes: (text: string) => void;
  onBack: () => void;
  onNext: () => void;
}

const GROUPS: { kind: CardKind; title: string; blurb: string; icon: typeof Scale }[] = [
  { kind: 'domain', title: '비즈니스 규칙', blurb: '돈·권한·기록처럼 앱마다 다른 규칙입니다. 코딩 AI가 임의로 정하면 가장 크게 어긋나는 부분이에요.', icon: Scale },
  { kind: 'tech', title: '기술 선택', blurb: '어디서 돌아가고 어디에 저장할지 같은 기반 결정입니다.', icon: Cpu },
];

export function CardsStep({ result, answers, custom, notes, featureChoices, onFeature, onAnswer, onCustom, onNotes, onBack, onNext }: Props) {
  const { summary, cards, feasibility, features } = result.data;
  const [confirmed, setConfirmed] = useState(false);
  const policyOf = (card: Card) => card.options.find((o) => o.id === answers[card.id])?.policy ?? '';
  return (
    <>
      {feasibility && <FeasibilityPanel f={feasibility} />}
      <section className="Panel">
        <div className="Row">
          <h2 className="SectionTitle">해석이 갈리는 지점 {cards.length}개</h2>
          <span className="Spacer" />
          <SourceBadge result={result} />
        </div>
        {summary && <p className="Muted">{summary}</p>}
        <p className="Note">추천안이 미리 선택돼 있습니다. 보기마다 고르면 구현이 얼마나 어려워지는지(점 1~3개)가 함께 표시돼요. 다르게 하고 싶은 카드만 바꾸거나, 보기에 없으면 직접 입력하세요.</p>
      </section>

      {GROUPS.map(({ kind, title, blurb, icon: Icon }) => {
        const group = cards.filter((c) => c.kind === kind);
        if (group.length === 0) return null;
        return (
          <div key={kind} className="CardGroup">
            <div className="GroupHead">
              <h2 className="SectionTitle"><Icon size={17} /> {title} <span className="ColCount">{group.length}</span></h2>
              <p className="CardWhy">{blurb}</p>
            </div>
            {group.map((card) => {
        const typing = answers[card.id] === CUSTOM_ANSWER;
        return (
          <section key={card.id} className="Panel">
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
                    <span className="OptionCost">
                      <Dots level={o.difficulty} />
                      {o.effort && <span className="Note">{o.effort}</span>}
                    </span>
                  </button>
                );
              })}
              <button
                role="radio"
                aria-checked={typing}
                className={`Option custom${typing ? ' selected' : ''}`}
                onClick={() => onAnswer(card.id, CUSTOM_ANSWER)}
              >
                <span className="OptionLabel"><PenLine size={13} /> 직접 입력</span>
                <span className="OptionDetail">보기에 원하는 답이 없을 때</span>
              </button>
            </div>
            {typing && (
              <input
                className="Input"
                autoFocus
                value={custom[card.id] ?? ''}
                maxLength={MAX_CUSTOM_ANSWER_CHARS}
                placeholder="원하는 답을 짧게 적어 주세요"
                onChange={(e) => onCustom(card.id, e.target.value)}
              />
            )}
            {typing && <p className="Note">규칙 추천은 이 카드의 추천안을 기준으로 계산됩니다. 다음 단계에서 규칙을 직접 켜고 끌 수 있어요.</p>}
            {card.kind === 'domain' && !typing && policyOf(card) && <p className="Policy">사양서에 들어갈 규칙: {policyOf(card)}</p>}
          </section>
        );
            })}
          </div>
        );
      })}

      <FeatureIdeas ideas={features} choices={featureChoices} onChoose={onFeature} />

      <section className="Panel">
        <h3 className="CardQ">코딩 AI에게 덧붙일 말 (선택)</h3>
        <p className="CardWhy">카드로 다 못 담은 요구사항이 있으면 적어 주세요. 사양서와 작업 계획에 반영됩니다.</p>
        <textarea
          className="Textarea"
          value={notes}
          maxLength={MAX_NOTES_CHARS}
          placeholder="예: 회원 명단은 엑셀에서 붙여넣을 수 있으면 좋겠어"
          onChange={(e) => onNotes(e.target.value)}
        />
      </section>

      <div className="Row">
        <button className="Btn" onClick={onBack}><ArrowLeft size={15} /> 요청 고치기</button>
        <span className="Spacer" />
        {/* Enterprise-sized: going on takes a second, deliberate click (inline two-step, no dialog). */}
        {feasibility?.tier === 'enterprise' && !confirmed ? (
          <button className="Btn primary" onClick={() => setConfirmed(true)}>
            <AlertTriangle size={15} /> 기업급 프로젝트예요. 알고 진행할게요
          </button>
        ) : (
          <button className="Btn primary" onClick={onNext}>
            {feasibility?.tier === 'enterprise' ? '그래도 진행 (범위를 줄여서)' : '규칙 고르기'} <ArrowRight size={15} />
          </button>
        )}
      </div>
    </>
  );
}
