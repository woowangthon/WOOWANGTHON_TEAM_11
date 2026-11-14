import type { Generated } from '@spec/core';

/**
 * Every generated block says whether AI produced it. The contest forbids passing fixed
 * output off as live output, so the fallback is labelled, with its reason, not hidden.
 */
// The two failures a visitor on the shared free key will actually meet, said in their language.
const REASONS: Record<string, string> = {
  'all models failed': 'AI 응답 실패, 무료 한도일 수 있어요. 잠시 뒤 다시 시도하거나 AI 설정에서 내 키를 쓰세요',
  'AI took too long': 'AI 응답이 너무 오래 걸렸어요. 잠시 뒤 다시 시도해 주세요',
};

export function SourceBadge({ result }: { result: Pick<Generated<unknown>, 'source' | 'model' | 'error'> }) {
  if (result.source === 'ai') return <span className="Badge">AI 생성 · {result.model}</span>;
  const reason = result.error ? (REASONS[result.error] ?? result.error) : '알 수 없는 오류';
  return (
    <span className="Badge fallback" title={result.error ?? undefined}>
      AI 미사용 · 기본값 ({reason})
    </span>
  );
}
