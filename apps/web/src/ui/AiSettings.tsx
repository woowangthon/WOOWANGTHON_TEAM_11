import { useState } from 'react';
import { Check, KeyRound, Lock, Trash2 } from 'lucide-react';
import { PROVIDERS } from '@spec/core';
import type { ProviderId } from '@spec/core';
import { getCredentials, maskKey, restoreCredentials, setCredentials } from '../credentials.ts';

const IDS = Object.keys(PROVIDERS) as ProviderId[];

/**
 * Lets a user run the AI steps on their own Claude / OpenAI / Gemini key instead of the
 * shared free one. The key stays in this tab and is only ever sent to this site's API,
 * which forwards it to the provider's fixed address and keeps nothing.
 */
export function AiSettings() {
  const [restored] = useState(restoreCredentials);
  const [saved, setSaved] = useState(restored.creds ?? getCredentials());
  const [remember, setRemember] = useState(restored.remembered);
  const [provider, setProvider] = useState<ProviderId>(saved?.provider ?? 'anthropic');
  const [key, setKey] = useState('');
  const [model, setModel] = useState(saved?.model ?? PROVIDERS.anthropic.models[0]);

  const presets: readonly string[] = PROVIDERS[provider].models;

  function save() {
    const next = { provider, key: key.trim(), model: model.trim() };
    setCredentials(next, remember);
    setSaved(next);
    setKey('');
  }

  function clear() {
    setCredentials(null, false);
    setSaved(null);
    setKey('');
  }

  return (
    <section className="Panel">
      <h3 className="SideTitle"><KeyRound size={14} /> AI 설정</h3>
      {saved ? (
        <div className="Row">
          <span className="Badge solid"><Lock size={11} /> {PROVIDERS[saved.provider].label}</span>
          <span className="Note">{saved.model || '기본 모델'} · {maskKey(saved.key)}</span>
          <span className="Spacer" />
          <button className="IconBtn" aria-label="키 지우기" onClick={clear}><Trash2 size={14} /></button>
        </div>
      ) : (
        <p className="Note">지금은 무료 Gemini(공용 키)로 동작합니다. 내 Claude·GPT 키로 바꿀 수 있어요.</p>
      )}

      <div className="Tabs" role="tablist" aria-label="AI 제공자">
        {IDS.map((id) => (
          <button
            key={id}
            role="tab"
            aria-selected={provider === id}
            className={`Tab${provider === id ? ' active' : ''}`}
            onClick={() => {
              setProvider(id);
              setModel(PROVIDERS[id].models[0] ?? '');
            }}
          >
            {id === 'anthropic' ? 'Claude' : id === 'openai' ? 'GPT' : 'Gemini'}
          </button>
        ))}
      </div>
      <input
        className="Input"
        type="password"
        autoComplete="off"
        spellCheck={false}
        placeholder={`${PROVIDERS[provider].label} API 키`}
        value={key}
        onChange={(e) => setKey(e.target.value)}
      />
      {presets.length > 0 && (
        <div className="Row">
          {presets.map((m) => (
            <button key={m} className={`Chip${model === m ? ' selected' : ''}`} onClick={() => setModel(m)}>
              {model === m && <Check size={11} />} {m}
            </button>
          ))}
        </div>
      )}
      <input
        className="Input"
        spellCheck={false}
        placeholder={presets.length ? '모델 (위에서 고르거나 직접 입력)' : '모델 이름 (필수, 예: 사용하는 GPT 모델)'}
        value={model}
        onChange={(e) => setModel(e.target.value)}
      />
      <button className="RuleRow" role="checkbox" aria-checked={remember} onClick={() => setRemember(!remember)}>
        <span className={`Check${remember ? ' on' : ''}`} aria-hidden><Check size={12} strokeWidth={3} /></span>
        <span className="RuleWhy">이 탭을 닫을 때까지 기억 (끄면 새로고침 시 지워짐)</span>
      </button>
      <button className="Btn primary" onClick={save} disabled={key.trim().length < 20 || (presets.length === 0 && !model.trim())}>
        내 키로 사용
      </button>
      <p className="Note">
        키는 서버에 저장하지 않고 로그에도 남기지 않습니다. 요청마다 이 사이트를 거쳐 {PROVIDERS[provider].label}의 공식 주소로만 전달되고,
        다른 곳으로 보내는 건 브라우저 보안 정책(CSP)이 막습니다. 사용 요금은 키 주인에게 청구됩니다.
      </p>
    </section>
  );
}
