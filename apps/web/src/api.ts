import type { Card, Decision, Generated, Profile, Task } from '@spec/core';

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error((data as { error?: string } | null)?.error ?? `서버 오류 (${res.status})`);
  return data as T;
}

export const fetchCards = (request: string) =>
  post<Generated<{ summary: string; cards: Card[] }>>('/api/cards', { request });

export const fetchTasks = (input: { request: string; decisions: Decision[]; ruleIds: string[]; profile: Profile }) =>
  post<Generated<Task[]>>('/api/tasks', input);
