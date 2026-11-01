import { useEffect, useMemo, useRef, useState } from 'react';
import { deriveProfile, recommendRules, recommendedAnswers, toDecisions, translatableTexts } from '@spec/core';
import type { Answers, Card, CustomAnswers, Generated, SpecInput, Task } from '@spec/core';
import { fetchCards, fetchTasks, fetchTranslate } from './api.ts';
import type { TranslateResult } from './api.ts';
import { applyTheme, loadScheme, saveScheme } from './theme.ts';
import type { Scheme } from './theme.ts';
import { TopNav } from './ui/TopNav.tsx';
import type { NavStep } from './ui/TopNav.tsx';
import { Sidebar } from './ui/Sidebar.tsx';
import { RequestStep } from './steps/RequestStep.tsx';
import { CardsStep } from './steps/CardsStep.tsx';
import { RulesStep } from './steps/RulesStep.tsx';
import { SpecStep } from './steps/SpecStep.tsx';
import { ReviewStep } from './steps/ReviewStep.tsx';

type Step = 'request' | 'cards' | 'rules' | 'spec' | 'review';
const STEPS: (NavStep<Step> & { title: string; desc: string })[] = [
  { id: 'request', label: '요청', title: '무엇을 만들고 싶나요', desc: '평소 말투 그대로 적으면, 해석이 갈리는 지점을 AI가 찾아 줍니다.' },
  { id: 'cards', label: '갈림길', title: '갈림길 정하기', desc: '추천안이 미리 골라져 있습니다. 다르게 하고 싶은 것만 바꾸세요.' },
  { id: 'rules', label: '규칙', title: '유지보수·보안 규칙', desc: '고른 내용에 맞춰 규칙 기반으로 추천합니다. 오른쪽 요약에 실시간 반영됩니다.' },
  { id: 'spec', label: '사양서', title: '코딩 AI용 사양서', desc: '영어본을 코딩 AI에게 주고, 한국어본으로 내용을 확인하세요.' },
  { id: 'review', label: '점검', title: '만든 코드 점검', desc: '코딩 AI가 만든 코드가 규칙을 지켰는지 보고, 고칠 것만 골라 다시 요청합니다.' },
];

export function App() {
  const [scheme, setScheme] = useState<Scheme>(loadScheme);
  const [step, setStep] = useState<Step>('request');
  const [request, setRequest] = useState('');
  const [cardsResult, setCardsResult] = useState<Generated<{ summary: string; cards: Card[] }> | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [custom, setCustom] = useState<CustomAnswers>({});
  const [notes, setNotes] = useState('');
  // Only the user's deviations are stored; the effective selection is derived from the
  // recommendation, so changing an answer later re-recommends without erasing their toggles.
  const [ruleOverrides, setRuleOverrides] = useState<Record<string, boolean>>({});
  // A snapshot taken when the spec is generated. Rendering never recomputes it from the
  // live answers: an empty write-in answer would throw mid-render and blank the page.
  const [spec, setSpec] = useState<{ input: SpecInput; tasks: Generated<Task[]>; translation: TranslateResult } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    applyTheme(scheme);
    saveScheme(scheme);
  }, [scheme]);

  // The main column scrolls on its own (desktop) or with the window (mobile); reset both.
  // A new step starts at its top, and an error is shown at the top, so it must be scrolled into view.
  const mainRef = useRef<HTMLElement>(null);
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
    window.scrollTo({ top: 0 });
  }, [step, error]);

  const cards = cardsResult?.data.cards ?? [];
  const profile = useMemo(() => deriveProfile(cards, answers), [cards, answers]);
  const recommendations = useMemo(() => recommendRules(profile), [profile]);
  const selectedRules = recommendations.filter((r) => ruleOverrides[r.rule.id] ?? r.recommended).map((r) => r.rule);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const makeCards = () =>
    run(async () => {
      const res = await fetchCards(request);
      setCardsResult(res);
      setAnswers(recommendedAnswers(res.data.cards));
      setCustom({});
      setNotes('');
      setRuleOverrides({});
      setSpec(null);
      setStep('cards');
    });

  const goRules = () =>
    run(async () => {
      toDecisions(cards, answers, custom); // throws with a readable message on an empty typed answer
      setStep('rules');
    });

  const makeSpec = () =>
    run(async () => {
      const decisions = toDecisions(cards, answers, custom);
      const tasks = await fetchTasks({ request, decisions, ruleIds: selectedRules.map((r) => r.id), profile, notes });
      const input: SpecInput = { request, summary: cardsResult?.data.summary ?? '', decisions, notes, rules: selectedRules, tasks: tasks.data };
      setSpec({ input, tasks, translation: await fetchTranslate(translatableTexts(input)) });
      setStep('spec');
    });

  // Any change to what the spec was built from makes it stale; it must be generated again.
  const edit = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setSpec(null);
  };

  const reachedIndex = spec ? 4 : cardsResult ? 2 : 0;

  return (
    <>
      <TopNav steps={STEPS} current={step} reachedIndex={reachedIndex} onStep={setStep} scheme={scheme} onScheme={setScheme} />
      <div className="Page">
        <main className="Main" ref={mainRef}>
          {(() => {
            const i = STEPS.findIndex((s) => s.id === step);
            return (
              <div className="StepHead">
                <span className="Eyebrow">Step {i + 1} / {STEPS.length}</span>
                <h1 className="StepTitle">{STEPS[i].title}</h1>
                <p className="StepDesc">{STEPS[i].desc}</p>
              </div>
            );
          })()}
          {error && <div className="Error" role="alert">{error}</div>}

          {step === 'request' && <RequestStep request={request} onChange={setRequest} onSubmit={makeCards} busy={busy} />}
          {step === 'cards' && cardsResult && (
            <CardsStep
              result={cardsResult}
              answers={answers}
              custom={custom}
              notes={notes}
              onAnswer={(cardId, optionId) => edit(setAnswers)({ ...answers, [cardId]: optionId })}
              onCustom={(cardId, text) => edit(setCustom)({ ...custom, [cardId]: text })}
              onNotes={edit(setNotes)}
              onBack={() => setStep('request')}
              onNext={goRules}
            />
          )}
          {step === 'rules' && (
            <RulesStep
              recommendations={recommendations}
              overrides={ruleOverrides}
              onToggle={(id, on) => edit(setRuleOverrides)({ ...ruleOverrides, [id]: on })}
              onBack={() => setStep('cards')}
              onNext={makeSpec}
              busy={busy}
            />
          )}
          {step === 'spec' && cardsResult && spec && (
            <SpecStep
              input={spec.input}
              translation={spec.translation}
              cardsResult={cardsResult}
              tasksResult={spec.tasks}
              onBack={() => setStep('rules')}
              onReview={() => setStep('review')}
            />
          )}
          {step === 'review' && <ReviewStep rules={selectedRules} onBack={() => setStep('spec')} />}
        </main>
        <Sidebar
          profile={cardsResult ? profile : null}
          rules={selectedRules}
          decided={cards.filter((c) => answers[c.id]).length}
        />
      </div>
    </>
  );
}
