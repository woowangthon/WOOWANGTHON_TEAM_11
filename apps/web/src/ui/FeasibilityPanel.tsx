import { AlertTriangle, Gauge, Scissors } from 'lucide-react';
import type { Difficulty, Feasibility, Tier } from '@spec/core';
import { Dots } from './PlanView.tsx';

const TIER: Record<Tier, { label: string; level: Difficulty; line: string }> = {
  personal: { label: '혼자 가능', level: 'easy', line: '혼자 AI 코딩 도구로 며칠~몇 주 안에 동작하는 버전을 만들 수 있는 규모예요.' },
  team: { label: '팀·실무 경험 필요', level: 'medium', line: '혼자 시작하면 중간에 막힐 가능성이 커요. 범위를 줄이거나 경험자와 함께하세요.' },
  enterprise: { label: '기업급', level: 'hard', line: '실제 서비스로는 보안 감사·법적 대응·상시 운영 조직이 필요한 규모예요. 그대로 시작하지 마세요.' },
};

/** The verdict on the whole project, shown before any card so nobody starts something too big blind. */
export function FeasibilityPanel({ f }: { f: Feasibility }) {
  const t = TIER[f.tier];
  return (
    <section className="Panel" aria-label="프로젝트 규모 판정">
      <div className="Row">
        <h2 className="SectionTitle"><Gauge size={17} /> 이 프로젝트의 규모: {t.label}</h2>
        <Dots level={t.level} />
        <span className="Spacer" />
        <span className={`Badge${f.by === 'rule' ? ' fallback' : ''}`}>{f.by === 'rule' ? '규칙 판정 (AI 판단 없음)' : 'AI 판단'}</span>
      </div>
      <p>{t.line}</p>
      <p className="Muted">{f.why}</p>
      {f.raisedBy && (
        <div className="Error" role="note">
          <AlertTriangle size={13} /> 규칙으로 규모를 올렸어요: {f.raisedBy}
        </div>
      )}
      {f.risks.length > 0 && (
        <div className="Tags">
          {f.risks.map((r) => <span key={r} className="Tag">{r}</span>)}
        </div>
      )}
      {f.scopeDown && (
        <p className="Note"><Scissors size={12} /> 혼자 끝낼 수 있는 범위: {f.scopeDown}</p>
      )}
    </section>
  );
}
