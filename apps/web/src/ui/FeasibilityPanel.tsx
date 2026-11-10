import { AlertTriangle, Gauge, Scissors } from 'lucide-react';
import type { Difficulty, Feasibility, Goal, Tier } from '@spec/core';
import { Dots } from './PlanView.tsx';

const TIER: Record<Tier, { label: string; level: Difficulty; line: string }> = {
  personal: { label: '혼자 가능', level: 'easy', line: '혼자 AI 코딩 도구로 며칠~몇 주 안에 동작하는 버전을 만들 수 있는 규모예요.' },
  team: { label: '팀·실무 경험 필요', level: 'medium', line: '혼자서는 오래 걸리거나 실무 경험이 필요한 부분이 있어요. 아래 범위부터 나눠서 하거나 경험자와 함께하세요.' },
  enterprise: { label: '기업급', level: 'hard', line: '실제 서비스로는 보안 감사·법적 대응·상시 운영 조직이 필요한 규모예요. 그대로 시작하지 마세요.' },
};

const GOAL: Record<Goal, string> = { personal: '개인 사용', public: '공개·오픈소스', commercial: '판매·유료' };

// The question the owner actually has: "can I build this alone?" The tier name ("기업급") did not
// say it plainly enough, so the answer is a scale with the current step filled (feedback 11/10).
const ALONE: { tier: Tier; label: string }[] = [
  { tier: 'personal', label: '혼자 가능' },
  { tier: 'team', label: '혼자는 어려움' },
  { tier: 'enterprise', label: '사실상 불가능' },
];

/** The verdict on the whole project, shown before any card so nobody starts something too big blind. */
export function FeasibilityPanel({ f }: { f: Feasibility }) {
  const t = TIER[f.tier];
  return (
    <section className="Panel" aria-label="프로젝트 규모 판정">
      <div className="Row">
        <h2 className="SectionTitle"><Gauge size={17} /> 이 프로젝트의 규모: {t.label}</h2>
        <span className="Tag">목적: {GOAL[f.goal]}</span>
        <Dots level={t.level} />
        <span className="Spacer" />
        <span className={`Badge${f.by === 'rule' ? ' fallback' : ''}`}>
          {f.by === 'rule' ? '규칙 판정 (AI 판단 없음)' : f.raisedBy ? 'AI 판단 + 규칙 보정' : 'AI 판단'}
        </span>
      </div>
      <div className="AloneScale" role="img" aria-label={`혼자 개발: ${ALONE.find((a) => a.tier === f.tier)?.label}`}>
        <span className="AloneLabel">혼자 개발</span>
        {ALONE.map((a) => (
          <span key={a.tier} className={`AloneStep${a.tier === f.tier ? ' on' : ''}`}>{a.label}</span>
        ))}
      </div>
      {f.tier === 'enterprise' && (
        <div className="AloneBanner" role="alert">
          <AlertTriangle size={18} />
          <span>
            <b>현재 기술로 개인이 만들기는 사실상 불가능해요.</b>
            <br />이대로 시작하면 중간에 멈출 가능성이 매우 커요.{' '}
            {f.scopeDown ? "아래 '혼자 끝낼 수 있는 범위'로 줄이거나" : '범위를 크게 줄이거나'} 팀·회사 단위로 진행하세요.
          </span>
        </div>
      )}
      <p>{t.line}</p>
      {/* A raised verdict shows the rule's reason only: the AI's reasoning argued for the smaller tier. */}
      {f.raisedBy ? (
        <div className="Error" role="note">
          <AlertTriangle size={13} /> 규칙으로 규모를 올렸어요{f.aiTier ? ` (AI는 '${TIER[f.aiTier].label}'로 봤음)` : ''}: {f.raisedBy}
        </div>
      ) : (
        <p className="Muted">{f.why}</p>
      )}
      {f.risks.length > 0 && (
        <div className="Tags">
          {f.risks.map((r) => <span key={r} className="Tag">{r}</span>)}
        </div>
      )}
      {f.goalAdds.length > 0 && (
        <p className="Note">{GOAL[f.goal]} 목적 때문에 추가되는 일: {f.goalAdds.join(' · ')}</p>
      )}
      {f.scopeDown && (
        <p className="Note"><Scissors size={12} /> 혼자 끝낼 수 있는 범위: {f.scopeDown}</p>
      )}
    </section>
  );
}
