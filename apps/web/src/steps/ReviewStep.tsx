import { useState } from 'react';
import { ArrowLeft, Check, Copy, FlaskConical, ScanSearch, ShieldCheck, Wrench } from 'lucide-react';
import { MAX_CODE_CHARS, buildFixPrompt } from '@spec/core';
import type { Finding, Rule, RuleCategory } from '@spec/core';
import { fetchReview } from '../api.ts';
import type { ReviewResult } from '../api.ts';
import { SourceBadge } from '../ui/SourceBadge.tsx';
import { SAMPLE_CODE } from './sampleCode.ts';

const VERDICT: Record<Finding['verdict'], { label: string; order: number }> = {
  violation: { label: '위반 의심', order: 0 },
  unclear: { label: '확인 불가', order: 1 },
  ok: { label: '지킴', order: 2 },
};
const GROUPS: { category: RuleCategory; title: string; icon: typeof Wrench }[] = [
  { category: 'security', title: '보안', icon: ShieldCheck },
  { category: 'engineering', title: '유지보수', icon: Wrench },
];

interface Props {
  rules: Rule[];
  onBack: () => void;
}

export function ReviewStep({ rules, onBack }: Props) {
  const [code, setCode] = useState('');
  const [isSample, setIsSample] = useState(false);
  const [result, setResult] = useState<ReviewResult | null>(null);
  // Only deviations from the default (violations picked, others not) are stored.
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<'ok' | 'fail' | null>(null);

  const ruleOf = (id: string) => rules.find((r) => r.id === id);
  const isPicked = (f: Finding) => picked[f.ruleId] ?? f.verdict === 'violation';
  const findings = [...(result?.findings ?? [])].sort((a, b) => VERDICT[a.verdict].order - VERDICT[b.verdict].order);
  const chosen = findings.filter(isPicked);
  const count = (v: Finding['verdict']) => findings.filter((f) => f.verdict === v).length;
  // Rules the AI did not report on (fallback, or omitted) count as unchecked, not as passed.
  const unchecked = rules.length - findings.length;
  const passRate = rules.length ? Math.round((count('ok') / rules.length) * 100) : 0;

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
        <h2 className="SectionTitle"><ScanSearch size={18} /> 만든 코드 점검</h2>
        <p className="Muted">
          코딩 AI가 만든 코드를 붙여넣으면 고른 규칙 {rules.length}개를 지켰는지 봅니다.
          키 하드코딩·빈 catch·300줄 초과 파일은 <b>규칙 검사</b>로 확정하고, 나머지는 <b>AI가 판단</b>합니다. 고칠지는 직접 고릅니다.
        </p>
        <textarea
          className="Textarea code"
          value={code}
          maxLength={MAX_CODE_CHARS}
          placeholder={'코드를 붙여넣으세요. 여러 파일이면 "=== 경로 ===" 줄로 구분하면 파일별로 봅니다.'}
          onChange={(e) => {
            setCode(e.target.value);
            setIsSample(false);
          }}
        />
        <div className="Row">
          <button className="Chip" onClick={() => { setCode(SAMPLE_CODE); setIsSample(true); }}>
            <FlaskConical size={12} /> 샘플 코드로 체험
          </button>
          {isSample && <span className="Badge fallback">샘플 코드 · 일부러 문제를 넣은 예시</span>}
          <span className="Spacer" />
          <span className="Note">{code.length.toLocaleString()} / {MAX_CODE_CHARS.toLocaleString()}</span>
          <button className="Btn primary" onClick={run} disabled={busy || !code.trim() || rules.length === 0}>
            {busy ? '점검 중…' : '점검하기'}
          </button>
        </div>
        {rules.length === 0 && <p className="Note">규칙 단계에서 고른 규칙이 없어 점검할 수 없습니다.</p>}
        {error && <div className="Error" role="alert">{error}</div>}
      </section>

      {result && (
        <>
          <section className="Panel">
            <div className="Row">
              <h3 className="SectionTitle">점검 결과</h3>
              <span className="Spacer" />
              <SourceBadge result={result} />
            </div>
            <div className="Stats" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
              <div className="Stat"><span className="StatNum">{count('violation')}</span><span className="StatLabel">위반 의심</span></div>
              <div className="Stat"><span className="StatNum">{count('unclear')}</span><span className="StatLabel">확인 불가</span></div>
              <div className="Stat"><span className="StatNum">{count('ok')}</span><span className="StatLabel">지킴</span></div>
              <div className="Stat"><span className="StatNum">{unchecked}</span><span className="StatLabel">판단 못 함</span></div>
            </div>
            <div className="Row"><span className="Note">규칙 준수율 {passRate}%</span></div>
            <div className="Meter"><div className="MeterFill" style={{ width: `${passRate}%` }} /></div>
          </section>

          {GROUPS.map(({ category, title, icon: Icon }) => {
            const items = findings.filter((f) => ruleOf(f.ruleId)?.category === category);
            if (items.length === 0) return null;
            return (
              <section key={category} className="Panel">
                <h3 className="SectionTitle"><Icon size={17} /> {title}</h3>
                <div className="RuleGroup">
                  {items.map((f) => {
                    const on = isPicked(f);
                    return (
                      <button
                        key={f.ruleId}
                        role="checkbox"
                        aria-checked={on}
                        className={`RuleRow${on ? ' on' : ''}`}
                        onClick={() => setPicked((p) => ({ ...p, [f.ruleId]: !on }))}
                      >
                        <span className={`Check${on ? ' on' : ''}`} aria-hidden><Check size={12} strokeWidth={3} /></span>
                        <span className="RuleBody">
                          <span className="RuleTitle">
                            {ruleOf(f.ruleId)?.title ?? f.ruleId}
                            <span className={f.verdict === 'violation' ? 'Badge solid' : 'Badge fallback'}>{VERDICT[f.verdict].label}</span>
                            <span className="Note">{f.by === 'rule' ? '규칙 검사' : 'AI 판단'}</span>
                          </span>
                          {f.evidence && <span className="Evidence">{f.evidence}</span>}
                          {f.fix && <span className="RuleWhy">{f.fix}</span>}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}

          <section className="Panel">
            <div className="Row">
              <h3 className="SectionTitle">코딩 AI에게 보낼 수정 요청</h3>
              <span className="Spacer" />
              <span className="Badge">{chosen.length}개 선택</span>
            </div>
            {chosen.length ? (
              <pre className="Spec">{buildFixPrompt(chosen, rules)}</pre>
            ) : (
              <p className="Empty">고칠 항목을 위에서 고르면 요청문이 여기에 만들어집니다.</p>
            )}
            <div className="Row">
              <span className="Spacer" />
              <button className="Btn primary" onClick={copy} disabled={chosen.length === 0}>
                <Copy size={14} /> {copied === 'ok' ? '복사됨' : copied === 'fail' ? '복사 실패' : '요청문 복사'}
              </button>
            </div>
          </section>
        </>
      )}

      <div className="Row">
        <button className="Btn" onClick={onBack}><ArrowLeft size={15} /> 사양서로</button>
      </div>
    </>
  );
}
