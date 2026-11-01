import { handleCards } from '../server/handlers.ts';
import { respond } from '../server/web.ts';

export default function (req: Request): Promise<Response> {
  return respond(req, handleCards);
}
