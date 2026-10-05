// Starts what the pin, reply and resolve flow needs, with no network beyond loopback:
//   1. the Pinthread API (the stock Worker, run by `wrangler dev` on a throwaway local D1 database), and
//   2. a static server: the site build (argv[4]) at /, e2e/fixture at /fixture/, and the built widget, bundled with its
//      dependencies, at /pinthread/.
// Usage: node serve.mjs <static-port> <api-port> <site-dist-dir>. The e2e runner starts this as the app command and stops it after the run.
// Needs `pnpm --filter pinthread run build` first (the widget is bundled from packages/pinthread/dist).
import { spawn, spawnSync } from 'node:child_process';
import { createReadStream, existsSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const root = resolve(here, '..');
const [staticPort, apiPort, siteDir] = [Number(process.argv[2] ?? 4343), Number(process.argv[3] ?? 8788), resolve(process.argv[4] ?? '.')];
const pkgDir = join(root, 'packages', 'pinthread');
const fixtureDir = join(here, 'fixture');
const widgetDir = mkdtempSync(join(tmpdir(), 'pinthread-e2e-widget-'));
const state = mkdtempSync(join(tmpdir(), 'pinthread-e2e-d1-'));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.map': 'application/json' };

// dist/index.js keeps its dependencies external, so a browser page cannot load it as is. Bundle it once.
const { build } = createRequire(join(pkgDir, 'package.json'))('esbuild');
await build({ entryPoints: [join(pkgDir, 'dist', 'index.js')], bundle: true, format: 'esm', outfile: join(widgetDir, 'index.js'), logLevel: 'warning' });

const wrangler = (args) =>
  spawn('pnpm', ['exec', 'wrangler', ...args], {
    cwd: pkgDir,
    shell: process.platform === 'win32',
    windowsHide: true,
    stdio: 'inherit',
    env: { ...process.env, CI: '1', WRANGLER_SEND_METRICS: 'false' },
  });

const migrate = wrangler(['d1', 'migrations', 'apply', 'DB', '--local', '--persist-to', state, '--config', 'server/wrangler.jsonc']);
await new Promise((ok, fail) =>
  migrate.on('exit', (code) => (code === 0 ? ok() : fail(new Error(`D1 migration failed with exit code ${code}`)))),
).catch((error) => {
  console.error(error.message);
  process.exit(1);
});
const api = wrangler(['dev', '--config', 'server/wrangler.jsonc', '--ip', '127.0.0.1', '--port', String(apiPort), '--persist-to', state]);

const serve = (base, rest, res) => {
  const file = normalize(join(base, rest === '/' || rest === '' ? 'index.html' : rest));
  if (!file.startsWith(base) || !existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404).end('not found');
    return;
  }
  res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(res);
};
const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (path.startsWith('/pinthread/')) serve(widgetDir, path.slice('/pinthread'.length), res);
  // Any /fixture/<name>/ path serves the fixture page, so each test run gets its own page key (the widget keys threads by path).
  else if (path.startsWith('/fixture/')) serve(fixtureDir, existsSync(join(fixtureDir, path.slice('/fixture'.length))) && statSync(join(fixtureDir, path.slice('/fixture'.length))).isFile() ? path.slice('/fixture'.length) : '/', res);
  else serve(siteDir, path, res);
});

const stop = () => {
  server.close();
  if (api.pid) spawnSync('taskkill', ['/pid', String(api.pid), '/t', '/f'], { windowsHide: true, stdio: 'ignore' });
  // wrangler leaves workerd running on the API port after its shell is gone; an orphan still answering there serves
  // a later run's requests from an old store. Stop whatever still listens on the API port.
  for (const line of spawnSync('netstat', ['-ano'], { windowsHide: true, encoding: 'utf8' }).stdout?.split('\n') ?? []) {
    const match = new RegExp(`127\\.0\\.0\\.1:${apiPort}\\s+\\S+\\s+LISTENING\\s+(\\d+)`).exec(line);
    if (match) spawnSync('taskkill', ['/pid', match[1], '/t', '/f'], { windowsHide: true, stdio: 'ignore' });
  }
  for (const dir of [state, widgetDir]) {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {}
  }
  setTimeout(() => process.exit(0), 500);
};
process.on('SIGTERM', stop);
process.on('SIGINT', stop);

// The runner treats an answering static port as "app ready", so listen only once the API answers /health.
for (let attempt = 0; ; attempt++) {
  if (attempt > 240) {
    console.error('Pinthread API did not become healthy within 120 s');
    stop();
    break;
  }
  try {
    if ((await fetch(`http://127.0.0.1:${apiPort}/health`)).ok) break;
  } catch {}
  await new Promise((r) => setTimeout(r, 500));
}
server.listen(staticPort, '127.0.0.1');
