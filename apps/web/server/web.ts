import type { HandlerResult } from './handlers.ts';

/** Adapts a framework-free handler to the Web Request/Response pair Vercel functions use. */
export async function respond(
  req: Request,
  handler: (body: unknown, env: Record<string, string | undefined>, clientId: string) => Promise<HandlerResult>,
): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'JSON 본문이 필요합니다.' }, { status: 400 });
  }
  const clientId = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const result = await handler(body, process.env, clientId);
  return Response.json(result.body, { status: result.status });
}
