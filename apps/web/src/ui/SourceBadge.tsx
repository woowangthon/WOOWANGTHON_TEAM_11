import type { Generated } from '@spec/core';

/**
 * Every generated block says whether AI produced it. The contest forbids passing fixed
 * output off as live output, so the fallback is labelled, with its reason, not hidden.
 */
export function SourceBadge({ result }: { result: Pick<Generated<unknown>, 'source' | 'model' | 'error'> }) {
  if (result.source === 'ai') return <span className="Badge">AI 생성 · {result.model}</span>;
  return (
    <span className="Badge fallback" title={result.error ?? undefined}>
      AI 미사용 · 기본값 ({result.error ?? '알 수 없는 오류'})
    </span>
  );
}
