import { Moon, Sun } from 'lucide-react';
import type { Scheme } from '../theme.ts';

export interface NavStep<T extends string> {
  id: T;
  label: string;
}

interface Props<T extends string> {
  steps: NavStep<T>[];
  current: T;
  /** Steps after this index cannot be opened yet: their input does not exist. */
  reachedIndex: number;
  onStep: (id: T) => void;
  scheme: Scheme;
  onScheme: (s: Scheme) => void;
}

export function TopNav<T extends string>({ steps, current, reachedIndex, onStep, scheme, onScheme }: Props<T>) {
  return (
    <header className="Nav">
      <div className="NavBrand">
        <span className="NavDot" />
        Preflight
      </div>
      <nav className="NavSteps" aria-label="진행 단계">
        {steps.map((s, i) => (
          <button
            key={s.id}
            className={`NavStep${s.id === current ? ' active' : i <= reachedIndex ? ' done' : ''}`}
            disabled={i > reachedIndex}
            onClick={() => onStep(s.id)}
          >
            <span className="NavNum">{i + 1}</span>
            {s.label}
          </button>
        ))}
      </nav>
      <div className="NavRight">
        <button
          className="IconBtn"
          aria-label={scheme === 'dark' ? '라이트 모드' : '다크 모드'}
          onClick={() => onScheme(scheme === 'dark' ? 'light' : 'dark')}
        >
          {scheme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
    </header>
  );
}
