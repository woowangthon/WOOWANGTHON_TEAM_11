import { useEffect, useMemo, useState } from 'react';
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
const STEPS: NavStep<Step>[] = [
  { id: 'request', label: '요청' },
  { id: 'cards', label: '갈림길' },
  { id: 'rules', label: '규칙' },
  { id: 'spec', label: '사양서' },
  { id: 'review', label: '점검' },
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
  const [tasksResult, setTasksResult] = useState<Generated<Task[]> | null>(null);
  const [translation, setTranslation] = useState<TranslateResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    applyTheme(scheme);
    saveScheme(scheme);
  }, [scheme]);

  // A new step starts at its top; otherwise the long cards list leaves the next step scrolled to its end.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [step]);

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
      setTasksResult(null);
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
      setTasksResult(tasks);
      setTranslation(await fetchTranslate(translatableTexts(input)));
      setStep('spec');
    });

  const specInput: SpecInput | null =
    cardsResult && tasksResult
      ? { request, summary: cardsResult.data.summary, decisions: toDecisions(cards, answers, custom), notes, rules: selectedRules, tasks: tasksResult.data }
      : null;

  const reachedIndex = specInput ? 4 : cardsResult ? 2 : 0;

  return (
    <>
      <TopNav steps={STEPS} current={step} reachedIndex={reachedIndex} onStep={setStep} scheme={scheme} onScheme={setScheme} />
      <div className="Page">
        <main className="Main">
          {error && <div className="Error" role="alert">{error}</div>}

          {step === 'request' && <RequestStep request={request} onChange={setRequest} onSubmit={makeCards} busy={busy} />}
          {step === 'cards' && cardsResult && (
            <CardsStep
              result={cardsResult}
              answers={answers}
              custom={custom}
              notes={notes}
              onAnswer={(cardId, optionId) => setAnswers((a) => ({ ...a, [cardId]: optionId }))}
              onCustom={(cardId, text) => setCustom((c) => ({ ...c, [cardId]: text }))}
              onNotes={setNotes}
              onBack={() => setStep('request')}
              onNext={goRules}
            />
          )}
          {step === 'rules' && (
            <RulesStep
              recommendations={recommendations}
              overrides={ruleOverrides}
              onToggle={(id, on) => setRuleOverrides((o) => ({ ...o, [id]: on }))}
              onBack={() => setStep('cards')}
              onNext={makeSpec}
              busy={busy}
            />
          )}
          {step === 'spec' && cardsResult && tasksResult && translation && specInput && (
            <SpecStep
              input={specInput}
              translation={translation}
              cardsResult={cardsResult}
              tasksResult={tasksResult}
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
