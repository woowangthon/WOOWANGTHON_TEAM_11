import { defineConfig, loadEnv } from 'vite';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const routes: Record<string, 'handleCards' | 'handleTasks'> = {
  '/api/cards': 'handleCards',
  '/api/tasks': 'handleTasks',
};

/**
 * Serves the same handlers as the deployed functions during `vite dev`. They are loaded
 * through Vite (ssrLoadModule), not imported here: the config file runs in plain Node,
 * which cannot load the TypeScript sources of the workspace packages.
 */
function devApi(env: Record<string, string>): Plugin {
  return {
    name: 'dev-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const name = req.url ? routes[req.url.split('?')[0]] : undefined;
        if (!name || req.method !== 'POST') return next();
        let raw = '';
        for await (const chunk of req) raw += chunk;
        let body: unknown;
        try {
          body = JSON.parse(raw);
        } catch {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'JSON 본문이 필요합니다.' }));
          return;
        }
        const mod = await server.ssrLoadModule('/server/handlers.ts');
        const result = await mod[name](body, env, req.socket.remoteAddress ?? 'local');
        res.statusCode = result.status;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(result.body));
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // The key lives in the repo-root .env, shared by every app in the monorepo.
  const env = loadEnv(mode, '../..', '');
  return { plugins: [react(), devApi(env)] };
});
