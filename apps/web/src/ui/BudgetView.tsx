import { Wallet } from 'lucide-react';
import type { Budget, Generated, Plan } from '@spec/core';
import { SourceBadge } from './SourceBadge.tsx';

const VERDICT: Record<Budget['freeTier'], { label: string; note: string }> = {
  full: { label: '무료로 운영 가능', note: '가정한 규모에서는 무료 티어만으로 충분합니다.' },
  partial: { label: '일부 유료', note: '개발·시험은 무료지만 운영하면 비용이 생기는 항목이 있습니다.' },
  none: { label: '유료 필요', note: '가정한 규모에서는 무료 티어만으로 운영하기 어렵습니다.' },
};

export function BudgetView({ result }: { result: Generated<Plan> }) {
  const { budget } = result.data;
  const verdict = VERDICT[budget.freeTier];
  return (
    <section className="Panel">
      <div className="Row">
        <h3 className="SectionTitle"><Wallet size={17} /> 추정 예산</h3>
        <span className="Spacer" />
        <SourceBadge result={result} />
      </div>
      <p className="Note">가정한 규모: <b>{budget.assumedScale}</b></p>
      <div className="BudgetHero">
        <div className="Stat">
          <span className="StatNum">{budget.monthly}</span>
          <span className="StatLabel">월 예상 비용 (추정)</span>
        </div>
        <div className="Stat">
          <span className="StatNum Verdict">{verdict.label}</span>
          <span className="StatLabel">{verdict.note}</span>
        </div>
      </div>
      {budget.summary && <p className="Muted">{budget.summary}</p>}
      {budget.items.length > 0 && (
        <div className="Table" role="table" aria-label="서비스별 비용">
          <div className="TRow THead" role="row">
            <span role="columnheader">항목</span>
            <span role="columnheader">무료로 되는 범위</span>
            <span role="columnheader">유료가 되면</span>
          </div>
          {budget.items.map((i) => (
            <div key={i.name} className="TRow" role="row">
              <span role="cell"><b>{i.name}</b></span>
              <span role="cell">{i.free}</span>
              <span role="cell">{i.paid}</span>
            </div>
          ))}
        </div>
      )}
      <p className="Note">가격과 무료 한도는 제공자 정책에 따라 바뀝니다. 시작 전에 각 서비스의 가격 페이지를 한 번 확인하세요.</p>
    </section>
  );
}
