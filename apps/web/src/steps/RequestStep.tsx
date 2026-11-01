import { ArrowRight, ClipboardCheck, ShieldCheck, Split } from 'lucide-react';
import { MAX_REQUEST_CHARS } from '@spec/core';

const EXAMPLES = [
  '동아리 회비 관리 앱. 회원별 납부 여부를 보고 미납자에게 알림을 보내고 싶어',
  '자취생 냉장고 재료로 만들 수 있는 요리 추천 앱',
  '스터디 모임 출석체크랑 벌금 정산해주는 웹사이트',
];

const VALUES = [
  { icon: Split, title: '갈림길 카드', body: 'AI가 해석이 갈리는 지점을 찾아 추천안과 함께 보여줍니다. 고르기만 하면 됩니다.' },
  { icon: ShieldCheck, title: '유지보수·보안 규칙', body: '고른 내용에 맞춰 스파게티 코드와 보안 사고를 막는 규칙을 자동으로 붙입니다.' },
  { icon: ClipboardCheck, title: '만든 뒤 점검', body: '코딩 AI가 만든 코드가 규칙을 지켰는지 짚고, 고칠 것만 골라 다시 요청합니다.' },
];

interface Props {
  request: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  busy: boolean;
}

export function RequestStep({ request, onChange, onSubmit, busy }: Props) {
  const canSubmit = request.trim().length > 0 && request.length <= MAX_REQUEST_CHARS && !busy;
  return (
    <>
      <section className="Panel Hero">
        <h1 className="HeroTitle">비싼 코딩 AI에게 맡기기 전에,<br />싼 AI와 먼저 정리하세요</h1>
        <p className="HeroSub">
          요청이 모호하면 코딩 AI는 멋대로 채우고, 그걸 고치느라 다시 묻고 또 고칩니다.
          무료 경량 AI가 앞단에서 갈림길·규칙·보안을 정리해 한 번에 통하는 사양서를 만듭니다.
        </p>
        <div className="Values">
          {VALUES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="Value">
              <span className="ValueHead"><Icon size={15} /> {title}</span>
              <span className="ValueBody">{body}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="Panel">
        <h2 className="SectionTitle">만들고 싶은 앱을 평소 말투로 적어 주세요</h2>
        <p className="Muted">코딩 AI에게 하려던 말 그대로면 됩니다.</p>
        <textarea
          className="Textarea"
          value={request}
          maxLength={MAX_REQUEST_CHARS}
          placeholder="예: 동아리 회비 관리 앱을 만들고 싶어"
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && canSubmit) onSubmit();
          }}
        />
        <div className="Row">
          {EXAMPLES.map((ex) => (
            <button key={ex} className="Chip" onClick={() => onChange(ex)}>
              {ex.length > 22 ? `${ex.slice(0, 22)}…` : ex}
            </button>
          ))}
        </div>
        <div className="Row">
          <span className="Note">{request.length} / {MAX_REQUEST_CHARS} · Ctrl+Enter</span>
          <span className="Spacer" />
          <button className="Btn primary" onClick={onSubmit} disabled={!canSubmit}>
            {busy ? '갈림길 찾는 중…' : <>갈림길 찾기 <ArrowRight size={15} /></>}
          </button>
        </div>
      </section>
    </>
  );
}
