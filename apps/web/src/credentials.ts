import type { ProviderId } from '@spec/core';

export interface Credentials {
  provider: ProviderId;
  key: string;
  model: string;
}

// Memory first. sessionStorage only when the user opts in: it is cleared when the tab
// closes and is never shared with other tabs. localStorage is never used for a key.
const KEY = 'byok';
let current: Credentials | null = null;

export function getCredentials(): Credentials | null {
  return current;
}

export function setCredentials(next: Credentials | null, rememberInTab: boolean): void {
  current = next;
  try {
    if (next && rememberInTab) sessionStorage.setItem(KEY, JSON.stringify(next));
    else sessionStorage.removeItem(KEY);
  } catch {
    // Storage blocked: the key still works for this page load.
  }
}

export function restoreCredentials(): { creds: Credentials | null; remembered: boolean } {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw) {
      current = JSON.parse(raw) as Credentials;
      return { creds: current, remembered: true };
    }
  } catch {
    // Unreadable or blocked: start without a key.
  }
  return { creds: null, remembered: false };
}

/** Headers for a request; empty when the server's own free key should be used. */
export function credentialHeaders(): Record<string, string> {
  if (!current) return {};
  return {
    'X-LLM-Provider': current.provider,
    'X-LLM-Key': current.key,
    ...(current.model ? { 'X-LLM-Model': current.model } : {}),
  };
}

export const maskKey = (key: string) => (key.length > 8 ? `${key.slice(0, 4)}…${key.slice(-4)}` : '••••');
