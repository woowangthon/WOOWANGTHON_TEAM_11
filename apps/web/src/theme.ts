// From the monotone-accent-ui skill (references/theme.js), typed.
export type Scheme = 'dark' | 'light';

export const ACCENT = '#7C6FF0';

const hexToRgb = (hex: string) => {
  const n = Number.parseInt(hex.replace('#', ''), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
};

// Relative luminance above 0.62 means a light accent, so text on it goes dark.
const contrastOn = ({ r, g, b }: { r: number; g: number; b: number }) =>
  (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.62 ? '#1b1b1f' : '#ffffff';

export function applyTheme(scheme: Scheme, accent = ACCENT): void {
  const root = document.documentElement;
  root.dataset.theme = scheme;
  root.classList.add('theme-transition');
  setTimeout(() => root.classList.remove('theme-transition'), 320);
  const rgb = hexToRgb(accent);
  root.style.setProperty('--accent-color', accent);
  root.style.setProperty('--accent-rgb', `${rgb.r} ${rgb.g} ${rgb.b}`);
  root.style.setProperty('--accent-contrast', contrastOn(rgb));
}

const KEY = 'scheme';

export function loadScheme(): Scheme {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {
    // Storage blocked (private mode): fall through to the OS preference.
  }
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function saveScheme(scheme: Scheme): void {
  try {
    localStorage.setItem(KEY, scheme);
  } catch {
    // Not persisted; the choice still applies for this visit.
  }
}
