import { useEffect, useMemo, useState } from 'react';
import { deriveProfile, recommendRules, recommendedAnswers, toDecisions } from '@spec/core';
import type { Answers, Card, Generated, Task } from '@spec/core';
import { fetchCards, fetchTasks } from './api.ts';
import { applyTheme, loadScheme, saveScheme } from './theme.ts';
import type { Scheme } from './theme.ts';
import { RequestStep } from './steps/RequestStep.tsx';
import { CardsStep } from './steps/CardsStep.tsx';
import { RulesStep } from './steps/RulesStep.tsx';
import { SpecStep } from './steps/SpecStep.tsx';

type Step = 'request' | 'cards' | 'rules' | 'spec';
const STEPS: { id: Step; label: string }[] = [
  { id: 'request', label: '1 요청' },
  { id: 'cards', label: '2 갈림길' },
  { id: 'rules', label: '3 규칙' },
  { id: 'spec', label: '4 사양서' },
];

export function App() {
  const [scheme, setScheme] = useState<Scheme>(loadScheme);
  const [step, setStep] = useState<Step>('request');
  const [request, setRequest] = useState('');
  const [cardsResult, setCardsResult] = useState<Generated<{ summary: string; cards: Card[] }> | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  // Only the user's deviations are stored; the effective selection is derived from the
  // recommendation, so changing an answer later re-recommends without erasing their toggles.
  const [ruleOverrides, setRuleOverrides] = useState<Record<string, boolean>>({});
  const [tasksResult, setTasksResult] = useState<Generated<Task[]> | null>(null);
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
  const selectedRules = recommendations
    .filter((r) => ruleOverrides[r.rule.id] ?? r.recommended)
    .map((r) => r.rule);

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
      setRuleOverrides({});
      setTasksResult(null);
      setStep('cards');
    });

  const makeSpec = () =>
    run(async () => {
      const res = await fetchTasks({
        request,
        decisions: toDecisions(cards, answers),
        ruleIds: selectedRules.map((r) => r.id),
        profile,
      });
      setTasksResult(res);
      setStep('spec');
    });

  const reached = (id: Step) => STEPS.findIndex((s) => s.id === id) <= STEPS.findIndex((s) => s.id === step);

  return (
    <div className="Shell">
      <header className="Header">
        <div className="Brand">
          <h1>사전 설계 동료</h1>
          <p>비싼 코딩 AI에게 넘기기 전에, 싼 AI와 함께 갈림길·규칙·보안을 정리합니다.</p>
        </div>
        <div className="SegControl" role="group" aria-label="테마">
          {(['dark', 'light'] as const).map((s) => (
            <button key={s} className={`SegBtn${scheme === s ? ' active' : ''}`} onClick={() => setScheme(s)}>
              {s === 'dark' ? '다크' : '라이트'}
            </button>
          ))}
        </div>
      </header>

      <nav className="Steps" aria-label="진행 단계">
        {STEPS.map((s) => (
          <span key={s.id} className={`StepPill${s.id === step ? ' active' : reached(s.id) ? ' done' : ''}`}>
            {s.label}
          </span>
        ))}
      </nav>

      {error && <div className="Error" role="alert">{error}</div>}

      {step === 'request' && (
        <RequestStep request={request} onChange={setRequest} onSubmit={makeCards} busy={busy} />
      )}
      {step === 'cards' && cardsResult && (
        <CardsStep
          result={cardsResult}
          answers={answers}
          onAnswer={(cardId, optionId) => setAnswers((a) => ({ ...a, [cardId]: optionId }))}
          onBack={() => setStep('request')}
          onNext={() => setStep('rules')}
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
      {step === 'spec' && cardsResult && tasksResult && (
        <SpecStep
          input={{
            request,
            summary: cardsResult.data.summary,
            decisions: toDecisions(cards, answers),
            rules: selectedRules,
            tasks: tasksResult.data,
          }}
          cardsResult={cardsResult}
          tasksResult={tasksResult}
          onBack={() => setStep('rules')}
          onRestart={() => setStep('request')}
        />
      )}
    </div>
  );
}
