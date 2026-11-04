import { useState } from 'react';
import { Bug, Copy, Download } from 'lucide-react';
import { buildDebugRecord, debugFileName } from '@spec/core';
import type { DebugInput } from '@spec/core';

/**
 * Hands the whole run (input, choices, every AI answer and its source) back as one JSON file, so a
 * problem can be reported exactly instead of as a pasted spec the messenger cuts off. No key inside.
 */
export function DebugExport({ input }: { input: Omit<DebugInput, 'app'> }) {
  const [copied, setCopied] = useState<'ok' | 'fail' | null>(null);
  const record = () => buildDebugRecord({ ...input, app: { commit: __APP_COMMIT__ } });

  async function copy() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(record(), null, 2));
      setCopied('ok');
    } catch {
      setCopied('fail');
    }
    setTimeout(() => setCopied(null), 1600);
  }

  function download() {
    const r = record();
    const url = URL.createObjectURL(new Blob([JSON.stringify(r, null, 2)], { type: 'application/json' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: debugFileName(r) });
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="Panel">
      <h3 className="SideTitle"><Bug size={14} /> 이번 실행 기록</h3>
      <p className="Note">입력·선택·AI 응답 전체를 파일 하나로. 문제를 알릴 때 이걸 주시면 그대로 재현할 수 있어요. API 키는 들어가지 않습니다.</p>
      <div className="Row">
        <button className="Btn" onClick={copy}>
          <Copy size={13} /> {copied === 'ok' ? '복사됨' : copied === 'fail' ? '복사 실패' : '복사'}
        </button>
        <button className="Btn" onClick={download}><Download size={13} /> JSON 저장</button>
      </div>
    </section>
  );
}
