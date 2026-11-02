import type { CardsData, Decision, Finding, Generated, Plan, Profile, Source } from '@spec/core';
import { credentialHeaders } from './credentials.ts';

export interface ReviewResult {
  findings: Finding[];
  source: Source;
  model: string | null;
  error: string | null;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...credentialHeaders() },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error((data as { error?: string } | null)?.error ?? `서버 오류 (${res.status})`);
  return data as T;
}

export const fetchCards = (request: string) =>
  post<Generated<CardsData>>('/api/cards', { request });

export const fetchReview = (code: string, ruleIds: string[]) => post<ReviewResult>('/api/review', { code, ruleIds });

export const fetchTasks = (input: { request: string; decisions: Decision[]; ruleIds: string[]; profile: Profile; notes: string; domainRules: string[] }) =>
  post<Generated<Plan>>('/api/tasks', input);

export interface TranslateResult {
  lines: string[];
  source: Source;
  model: string | null;
  error: string | null;
}

export const fetchTranslate = (lines: string[]) => post<TranslateResult>('/api/translate', { lines });
