import { handleTasks } from '../server/handlers.ts';
import { respond } from '../server/web.ts';

export function POST(req: Request): Promise<Response> {
  return respond(req, handleTasks);
}
