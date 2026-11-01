import { useState } from 'react';
import { ArrowLeft, ArrowRight, Copy, Download, FileText, Gauge, Languages, ShieldAlert, Wallet } from 'lucide-react';
import { buildSpec, estimateTokens, securityChecksFor, withTexts } from '@spec/core';
import type { Card, Generated, Plan, Profile, SpecInput, SpecLang } from '@spec/core';
import type { TranslateResult } from '../api.ts';
import { SourceBadge } from '../ui/SourceBadge.tsx';
import { PlanView } from '../ui/PlanView.tsx';
import { BudgetView } from '../ui/BudgetView.tsx';
import { SecurityPanel } from '../ui/SecurityPanel.tsx';

type Tab = 'spec' | 'plan' | 'budget' | 'security';

interface Props {
  /** In Korean, as the user and the cards wrote it. */
  input: SpecInput;
  /** English versions of translatableTexts(input), or the Korean ones back on failure. */
  translation: TranslateResult;
  cardsResult: Generated<{ summary: string; cards: Card[] }>;
  tasksResult: Generated<Plan>;
  profile: Profile;
  onBack: () => void;
  onReview: () => void;
}

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  a.click();
  URL.revokeObjectURL(url);
}

export function SpecStep({ input, translation, cardsResult, tasksResult, profile, onBack, onReview }: Props) {
  const [tab, setTab] = useState<Tab>('spec');
  const [lang, setLang] = useState<SpecLang>('en');
  const [copied, setCopied] = useState<'ok' | 'fail' | null>(null);
  const english = buildSpec(withTexts(input, translation.lines), 'en');
  const korean = buildSpec(input, 'ko');
  const shown = lang === 'en' ? english : korean;
  const security = securityChecksFor(profile);
  const securityCount =
    tasksResult.data.securityFocus.length + security.length + input.tasks.reduce((n, t) => n + t.securityChecks.length, 0);

  const TABS: { id: Tab; label: string; icon: typeof FileText; count?: number }[] = [
    { id: 'spec', label: '사양서', icon: FileText },
    { id: 'plan', label: '작업·난이도', icon: Gauge, count: input.tasks.length },
    { id: 'budget', label: '예산', icon: Wallet },
    { id: 'security', label: '보안 확인', icon: ShieldAlert, count: securityCount },
  ];

  async function copy() {
    try {
      await navigator.clipboard.writeText(english);
      setCopied('ok');
    } catch {
      setCopied('fail');
    }
    setTimeout(() => setCopied(null), 1600);
  }

  return (
    <>
      <section className="Panel">
        <div className="Row">
          <span className="Note">갈림길</span><SourceBadge result={cardsResult} />
          <span className="Note">계획·예산</span><SourceBadge result={tasksResult} />
          <span className="Note">번역</span><SourceBadge result={translation} />
        </div>
        <div className="PageTabs" role="tablist">
          {TABS.map(({ id, label, icon: Icon, count }) => (
            <button key={id} role="tab" aria-selected={tab === id} className={`PageTab${tab === id ? ' active' : ''}`} onClick={() => setTab(id)}>
              <Icon size={15} /> {label}
              {count !== undefined && <span className="TabCount">{count}</span>}
            </button>
          ))}
        </div>
      </section>

      {tab === 'spec' && (
        <section className="Panel">
          <p className="Muted">
            코딩 AI에게는 <b>영어본</b>을 주세요. 영어 지시를 가장 정확히 따르고 토큰도 덜 씁니다. 한국어본은 확인용입니다.
            프로젝트 폴더에 <b>CLAUDE.md</b>(Claude Code) 또는 <b>AGENTS.md</b>(Codex·Cursor 등)로 두면 코딩 AI가 매번 읽습니다.
          </p>
          {translation.source === 'fallback' && (
            <p className="Note">번역에 실패해서 영어본에도 한국어 문장이 남아 있습니다. 그대로 써도 동작합니다.</p>
          )}
          <div className="Row">
            <div className="Tabs" role="tablist">
              <button role="tab" aria-selected={lang === 'en'} className={`Tab${lang === 'en' ? ' active' : ''}`} onClick={() => setLang('en')}>
                English · AI용
              </button>
              <button role="tab" aria-selected={lang === 'ko'} className={`Tab${lang === 'ko' ? ' active' : ''}`} onClick={() => setLang('ko')}>
                <Languages size={12} /> 한국어 · 확인용
              </button>
            </div>
            <span className="Spacer" />
            <span className="Note">≈{estimateTokens(shown).toLocaleString()} 토큰 (추정)</span>
          </div>
          <pre className="Spec">{shown}</pre>
          <div className="Row">
            <button className="Btn primary" onClick={copy}>
              <Copy size={14} /> {copied === 'ok' ? '복사됨' : copied === 'fail' ? '복사 실패 — 직접 선택해 주세요' : '영어본 복사'}
            </button>
            <button className="Btn" onClick={() => download('CLAUDE.md', english)}><Download size={14} /> CLAUDE.md <span className="Rec">추천</span></button>
            <button className="Btn" onClick={() => download('AGENTS.md', english)}><Download size={14} /> AGENTS.md</button>
            <button className="Btn" onClick={() => download('SPEC.ko.md', korean)}><Download size={14} /> 한국어본</button>
          </div>
        </section>
      )}
      {tab === 'plan' && <PlanView result={tasksResult} />}
      {tab === 'budget' && <BudgetView result={tasksResult} />}
      {tab === 'security' && <SecurityPanel focus={tasksResult.data.securityFocus} rules={security} tasks={input.tasks} />}

      <div className="Row">
        <button className="Btn" onClick={onBack}><ArrowLeft size={15} /> 규칙 다시 고르기</button>
        <span className="Spacer" />
        <button className="Btn primary" onClick={onReview}>작업 보드로 <ArrowRight size={15} /></button>
      </div>
    </>
  );
}
