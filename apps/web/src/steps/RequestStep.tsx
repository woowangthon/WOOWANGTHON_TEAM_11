import { MAX_REQUEST_CHARS } from '@spec/core';

const EXAMPLES = [
  '동아리 회비 관리 앱. 회원별 납부 여부를 보고 미납자에게 알림을 보내고 싶어',
  '자취생 냉장고 재료로 만들 수 있는 요리 추천 앱',
  '스터디 모임 출석체크랑 벌금 정산해주는 웹사이트',
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
    <section className="Panel">
      <h2 className="SectionTitle">만들고 싶은 앱을 평소 말투로 적어 주세요</h2>
      <p className="Muted">코딩 AI에게 하려던 말 그대로면 됩니다. 애매한 부분은 다음 단계에서 카드로 정리합니다.</p>
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
      <div className="Examples">
        {EXAMPLES.map((ex) => (
          <button key={ex} className="Chip" onClick={() => onChange(ex)}>
            {ex.length > 22 ? `${ex.slice(0, 22)}…` : ex}
          </button>
        ))}
      </div>
      <div className="Row">
        <span className="Note">{request.length} / {MAX_REQUEST_CHARS}</span>
        <span className="Spacer" />
        <button className="Btn primary" onClick={onSubmit} disabled={!canSubmit}>
          {busy ? '갈림길 찾는 중…' : '갈림길 찾기'}
        </button>
      </div>
    </section>
  );
}
