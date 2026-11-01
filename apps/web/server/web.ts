import type { Byok, HandlerResult } from './handlers.ts';

/** Header names for a user's own key. A header, not the body, so body logging can never capture it. */
export const BYOK_HEADERS = { provider: 'x-llm-provider', key: 'x-llm-key', model: 'x-llm-model' } as const;

export function readByok(get: (name: string) => string | null | undefined): Byok {
  return {
    provider: get(BYOK_HEADERS.provider) || null,
    key: get(BYOK_HEADERS.key) || null,
    model: get(BYOK_HEADERS.model) || null,
  };
}

/** Adapts a framework-free handler to the Web Request/Response pair edge functions use. */
export async function respond(
  req: Request,
  handler: (body: unknown, env: Record<string, string | undefined>, clientId: string, byok: Byok) => Promise<HandlerResult>,
): Promise<Response> {
  if (req.method !== 'POST') return Response.json({ error: 'POST만 지원합니다.' }, { status: 405 });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'JSON 본문이 필요합니다.' }, { status: 400 });
  }
  const clientId = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const result = await handler(body, process.env, clientId, readByok((n) => req.headers.get(n)));
  // Responses can echo a user's code or spec; nothing in between may cache them.
  return Response.json(result.body, { status: result.status, headers: { 'Cache-Control': 'no-store' } });
}
