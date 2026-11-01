import { useState } from 'react';
import { MAX_CODE_CHARS, buildFixPrompt } from '@spec/core';
import type { Finding, Rule } from '@spec/core';
import { fetchReview } from '../api.ts';
import type { ReviewResult } from '../api.ts';
import { SourceBadge } from '../ui/SourceBadge.tsx';

const VERDICT_LABEL: Record<Finding['verdict'], string> = { violation: '위반 의심', unclear: '확인 불가', ok: '지킴' };
const VERDICT_ORDER: Finding['verdict'][] = ['violation', 'unclear', 'ok'];

interface Props {
  rules: Rule[];
  onBack: () => void;
}

export function ReviewStep({ rules, onBack }: Props) {
  const [code, setCode] = useState('');
  const [result, setResult] = useState<ReviewResult | null>(null);
  // Only deviations from the default (violations on, others off) are stored.
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<'ok' | 'fail' | null>(null);

  const title = (id: string) => rules.find((r) => r.id === id)?.title ?? id;
  const isPicked = (f: Finding) => picked[f.ruleId] ?? f.verdict === 'violation';
  const findings = [...(result?.findings ?? [])].sort(
    (a, b) => VERDICT_ORDER.indexOf(a.verdict) - VERDICT_ORDER.indexOf(b.verdict),
  );
  const chosen = findings.filter(isPicked);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      setResult(await fetchReview(code, rules.map((r) => r.id)));
      setPicked({});
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(buildFixPrompt(chosen, rules));
      setCopied('ok');
    } catch {
      setCopied('fail');
    }
    setTimeout(() => setCopied(null), 1600);
  }

  return (
    <>
      <section className="Panel">
        <h2 className="SectionTitle">코딩 AI가 만든 코드 점검</h2>
        <p className="Muted">
          사양서로 만든 코드를 붙여넣으면, 고른 규칙 {rules.length}개를 지켰는지 짚어 줍니다. 무엇을 고칠지는 직접 고릅니다.
        </p>
        <textarea
          className="Textarea"
          value={code}
          maxLength={MAX_CODE_CHARS}
          placeholder={'코드를 붙여넣으세요. 여러 파일이면 "=== 경로 ===" 줄로 구분하면 파일별로 봅니다.'}
          onChange={(e) => setCode(e.target.value)}
        />
        <div className="Row">
          <span className="Note">{code.length.toLocaleString()} / {MAX_CODE_CHARS.toLocaleString()}</span>
          <span className="Spacer" />
          <button className="Btn primary" onClick={run} disabled={busy || !code.trim() || rules.length === 0}>
            {busy ? '점검 중…' : '점검하기'}
          </button>
        </div>
        {rules.length === 0 && <p className="Note">규칙 단계에서 고른 규칙이 없어 점검할 수 없습니다.</p>}
        {error && <div className="Error" role="alert">{error}</div>}
      </section>

      {result && (
        <section className="Panel">
          <div className="Row">
            <h3 className="CardQ">점검 결과</h3>
            <span className="Spacer" />
            <SourceBadge result={result} />
          </div>
          <p className="Note">"규칙 검사"는 패턴으로 확정한 것, "AI 판단"은 모델의 의견입니다. 고칠 항목을 고르세요.</p>
          {findings.length === 0 && <p className="Muted">발견된 문제가 없습니다.</p>}
          <div className="RuleGroup">
            {findings.map((f) => {
              const on = isPicked(f);
              return (
                <button
                  key={f.ruleId}
                  role="checkbox"
                  aria-checked={on}
                  className={`RuleRow${on ? ' on' : ''}`}
                  onClick={() => setPicked((p) => ({ ...p, [f.ruleId]: !on }))}
                >
                  <span className={`Check${on ? ' on' : ''}`} aria-hidden>✓</span>
                  <span className="RuleBody">
                    <span className="RuleTitle">
                      {title(f.ruleId)}
                      <span className={f.verdict === 'violation' ? 'Rec' : 'Badge fallback'}>{VERDICT_LABEL[f.verdict]}</span>
                      <span className="Note">{f.by === 'rule' ? '규칙 검사' : 'AI 판단'}</span>
                    </span>
                    {f.evidence && <span className="RuleWhy"><code>{f.evidence}</code></span>}
                    {f.fix && <span className="RuleWhy">{f.fix}</span>}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="Row">
            <span className="Note">{chosen.length}개 선택</span>
            <span className="Spacer" />
            <button className="Btn primary" onClick={copy} disabled={chosen.length === 0}>
              {copied === 'ok' ? '복사됨' : copied === 'fail' ? '복사 실패' : '수정 요청문 복사'}
            </button>
          </div>
        </section>
      )}

      <div className="Row">
        <button className="Btn" onClick={onBack}>← 사양서로</button>
      </div>
    </>
  );
}
