// Produces .vercel/output (Vercel Build Output API v3) so the deploy does not depend on
// Vercel's own TypeScript handling: the static site comes from `vite build`, and each file
// in apps/web/functions is bundled by esbuild into a self-contained edge function.
import { build } from 'esbuild';
import { cpSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { basename, join } from 'node:path';

const OUT = '.vercel/output';
const FUNCTIONS = 'apps/web/functions';

rmSync(OUT, { recursive: true, force: true });
execSync('npm run build -w apps/web', { stdio: 'inherit' });
mkdirSync(`${OUT}/static`, { recursive: true });
cpSync('apps/web/dist', `${OUT}/static`, { recursive: true });

const entries = readdirSync(FUNCTIONS).filter((f) => f.endsWith('.ts'));
if (entries.length === 0) throw new Error(`no functions found in ${FUNCTIONS}`);
for (const file of entries) {
  const dir = `${OUT}/functions/api/${basename(file, '.ts')}.func`;
  await build({
    entryPoints: [join(FUNCTIONS, file)],
    outfile: `${dir}/index.js`,
    bundle: true,
    format: 'esm',
    platform: 'browser',
    // Worker/browser builds of dependencies (the Anthropic SDK) avoid node:* modules the edge runtime lacks.
    conditions: ['worker', 'browser'],
    target: 'es2022',
    // process.env is provided by the edge runtime at request time; it must not be inlined at build.
    define: {},
  });
  writeFileSync(`${dir}/.vc-config.json`, JSON.stringify({ runtime: 'edge', entrypoint: 'index.js' }, null, 2));
}

// Security headers for every response. connect-src 'self' means the page can only talk to
// this site's own API: a user's key can never be sent anywhere else from the browser.
const SECURITY_HEADERS = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
    'font-src https://cdn.jsdelivr.net',
    "img-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join('; '),
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};
writeFileSync(
  `${OUT}/config.json`,
  JSON.stringify({ version: 3, routes: [{ src: '/(.*)', headers: SECURITY_HEADERS, continue: true }] }, null, 2),
);
console.log(`built ${entries.length} function(s) + static site into ${OUT}`);
