import { useState } from 'react';
import { buildSpec, estimateTokens } from '@spec/core';
import type { Card, Generated, SpecInput, Task } from '@spec/core';
import { SourceBadge } from '../ui/SourceBadge.tsx';

interface Props {
  input: SpecInput;
  cardsResult: Generated<{ summary: string; cards: Card[] }>;
  tasksResult: Generated<Task[]>;
  onBack: () => void;
  onRestart: () => void;
}

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  a.click();
  URL.revokeObjectURL(url);
}

export function SpecStep({ input, cardsResult, tasksResult, onBack, onRestart }: Props) {
  const spec = buildSpec(input);
  const [copied, setCopied] = useState<'ok' | 'fail' | null>(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(spec);
      setCopied('ok');
    } catch {
      setCopied('fail');
    }
    setTimeout(() => setCopied(null), 1600);
  }

  const engineering = input.rules.filter((r) => r.category === 'engineering').length;
  const security = input.rules.length - engineering;

  return (
    <>
      <section className="Panel">
        <h2 className="SectionTitle">코딩 AI에게 넘길 사양서</h2>
        <p className="Muted">
          프로젝트 폴더에 <b>CLAUDE.md</b>(Claude Code) 또는 <b>AGENTS.md</b>(Codex·Cursor 등)로 저장하면 코딩 AI가 매번 읽습니다.
        </p>
        <div className="Row">
          <div className="Stat"><span className="StatNum">{input.decisions.length}</span><span className="StatLabel">확정한 결정</span></div>
          <div className="Stat"><span className="StatNum">{engineering}</span><span className="StatLabel">유지보수 규칙</span></div>
          <div className="Stat"><span className="StatNum">{security}</span><span className="StatLabel">보안 규칙</span></div>
          <div className="Stat"><span className="StatNum">{input.tasks.length}</span><span className="StatLabel">작업 단계</span></div>
          <div className="Stat"><span className="StatNum">≈{estimateTokens(spec).toLocaleString()}</span><span className="StatLabel">사양서 토큰 (추정)</span></div>
        </div>
        <div className="Row">
          <span className="Note">갈림길 카드</span><SourceBadge result={cardsResult} />
          <span className="Note">작업 계획</span><SourceBadge result={tasksResult} />
        </div>
      </section>

      <section className="Panel">
        <div className="Row">
          <button className="Btn primary" onClick={copy}>
            {copied === 'ok' ? '복사됨' : copied === 'fail' ? '복사 실패 — 직접 선택해 주세요' : '복사'}
          </button>
          <button className="Btn" onClick={() => download('CLAUDE.md', spec)}>CLAUDE.md 저장</button>
          <button className="Btn" onClick={() => download('AGENTS.md', spec)}>AGENTS.md 저장</button>
        </div>
        <pre className="Spec">{spec}</pre>
      </section>

      <div className="Row">
        <button className="Btn" onClick={onBack}>← 규칙 다시 고르기</button>
        <span className="Spacer" />
        <button className="Btn" onClick={onRestart}>새 요청</button>
      </div>
    </>
  );
}
