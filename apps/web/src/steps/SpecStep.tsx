import { useState } from 'react';
import { ArrowLeft, ArrowRight, Copy, Download, Languages } from 'lucide-react';
import { buildSpec, estimateTokens, withTexts } from '@spec/core';
import type { Card, Generated, Plan, SpecInput, SpecLang } from '@spec/core';
import type { TranslateResult } from '../api.ts';
import { SourceBadge } from '../ui/SourceBadge.tsx';
import { PlanView } from '../ui/PlanView.tsx';

interface Props {
  /** In Korean, as the user and the cards wrote it. */
  input: SpecInput;
  /** English versions of translatableTexts(input), or the Korean ones back on failure. */
  translation: TranslateResult;
  cardsResult: Generated<{ summary: string; cards: Card[] }>;
  tasksResult: Generated<Plan>;
  onBack: () => void;
  onReview: () => void;
}

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  a.click();
  URL.revokeObjectURL(url);
}

export function SpecStep({ input, translation, cardsResult, tasksResult, onBack, onReview }: Props) {
  const [view, setView] = useState<SpecLang>('en');
  const [copied, setCopied] = useState<'ok' | 'fail' | null>(null);
  const english = buildSpec(withTexts(input, translation.lines), 'en');
  const korean = buildSpec(input, 'ko');
  const shown = view === 'en' ? english : korean;

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
        <h2 className="SectionTitle">코딩 AI에게 넘길 사양서</h2>
        <p className="Muted">
          코딩 AI에게는 <b>영어본</b>을 주세요. 영어 지시를 가장 정확히 따르고 토큰도 덜 씁니다. 한국어본은 내용 확인용입니다.
          프로젝트 폴더에 <b>CLAUDE.md</b>(Claude Code) 또는 <b>AGENTS.md</b>(Codex·Cursor 등)로 두면 코딩 AI가 매번 읽습니다.
        </p>
        <div className="Row">
          <span className="Note">갈림길</span><SourceBadge result={cardsResult} />
          <span className="Note">작업 계획</span><SourceBadge result={tasksResult} />
          <span className="Note">영어 번역</span><SourceBadge result={translation} />
        </div>
        {translation.source === 'fallback' && (
          <p className="Note">번역에 실패해서 영어본에도 한국어 문장이 남아 있습니다. 그대로 써도 동작합니다.</p>
        )}
      </section>

      <PlanView result={tasksResult} />

      <section className="Panel">
        <div className="Row">
          <div className="Tabs" role="tablist">
            <button role="tab" aria-selected={view === 'en'} className={`Tab${view === 'en' ? ' active' : ''}`} onClick={() => setView('en')}>
              English · AI용
            </button>
            <button role="tab" aria-selected={view === 'ko'} className={`Tab${view === 'ko' ? ' active' : ''}`} onClick={() => setView('ko')}>
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

      <div className="Row">
        <button className="Btn" onClick={onBack}><ArrowLeft size={15} /> 규칙 다시 고르기</button>
        <span className="Spacer" />
        <button className="Btn primary" onClick={onReview}>만든 코드 점검 <ArrowRight size={15} /></button>
      </div>
    </>
  );
}
