/**
 * DOES THE PRODUCTION START COMMAND WORK? (5 October 2026)
 *
 * Production starts the API with `node dist/main` (`start:prod`). On 5 October three specs imported from journey/,
 * the build's root moved up a level, the server landed at dist/src/main.js, `node dist/main` did not start, and the
 * embed's static files went missing. Every test passed. This checks the thing itself:
 *
 *   1. builds the API exactly as production does (`nest build`) into a temporary folder, never into api/dist;
 *   2. checks that dist/main.js and the embed's static files (embed.js, panel.html) are there, and that there is no
 *      dist/src;
 *   3. starts `node dist/main` on a spare port against the database it is given, which must be on this computer;
 *   4. waits for /health to answer "ok", reads /embed.js, and stops the server.
 *
 * It writes nothing to any database: it only starts the server and reads two addresses. From api/:
 *
 *   npm run check:production-start -- --database postgresql://you@localhost:5432/your_local_db [--env .env]
 *
 * `--env` loads the other settings the server needs (the file is read, never printed). Exits 0 when it starts, 1 when
 * it does not, and says why in a sentence.
 */
import { spawn, spawnSync } from 'child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, symlinkSync } from 'fs';
import { createServer } from 'net';
import { tmpdir } from 'os';
import { join, resolve } from 'path';

const API = resolve(__dirname, '..');

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

/** Only a database on this computer. */
export function aLocalDatabase(url: string | undefined): boolean {
  if (!url) return false;
  try {
    return ['localhost', '127.0.0.1', '[::1]'].includes(new URL(url).hostname);
  } catch {
    return false;
  }
}

/** KEY=value lines, with optional quotes. Comments and blank lines are skipped. */
export function readAnEnvFile(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (!m || line.trim().startsWith('#')) continue;
    out[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  return out;
}

/** What must be in a production build, and what must not. Returns the problems, in sentences. */
export function whatIsWrongWithTheBuild(dist: string): string[] {
  const problems: string[] = [];
  if (!existsSync(join(dist, 'main.js'))) problems.push('dist/main.js is missing, so `node dist/main` cannot start.');
  if (existsSync(join(dist, 'src'))) problems.push('dist/src exists, so something under src imports from outside src and the build root moved.');
  for (const f of ['embed.js', 'panel.html']) {
    if (!existsSync(join(dist, 'modules', 'embed', 'static', f))) problems.push(`The embed's ${f} is missing from dist/modules/embed/static.`);
  }
  return problems;
}

function aSparePort(): Promise<number> {
  return new Promise((ok, fail) => {
    const s = createServer();
    s.once('error', fail);
    s.listen(0, '127.0.0.1', () => {
      const port = (s.address() as any).port;
      s.close(() => ok(port));
    });
  });
}

async function answers(url: string): Promise<{ status: number; body: string } | null> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(3000) });
    return { status: r.status, body: await r.text() };
  } catch {
    return null;
  }
}

async function main(): Promise<number> {
  const database = arg('database');
  if (!aLocalDatabase(database)) {
    console.log('Give a database on this computer with --database (localhost or 127.0.0.1). Nothing was started.');
    return 1;
  }
  const envFile = arg('env');
  const fromFile = envFile ? readAnEnvFile(readFileSync(resolve(envFile), 'utf8')) : {};

  const work = mkdtempSync(join(tmpdir(), 'gw-production-start-'));
  try {
    for (const f of ['src', 'tsconfig.json', 'nest-cli.json', 'package.json']) cpSync(join(API, f), join(work, f), { recursive: true });
    symlinkSync(join(API, 'node_modules'), join(work, 'node_modules'));

    console.log('Building as production does (nest build), in a temporary folder.');
    const build = spawnSync('npx', ['nest', 'build'], { cwd: work, stdio: 'inherit' });
    if (build.status !== 0) { console.log('The build failed.'); return 1; }

    const problems = whatIsWrongWithTheBuild(join(work, 'dist'));
    if (problems.length) { for (const p of problems) console.log(p); return 1; }
    console.log('dist/main.js and the embed\'s static files are where production looks for them.');

    const port = await aSparePort();
    const env = { ...process.env, ...fromFile, DATABASE_URL: database as string, PORT: String(port), NODE_ENV: fromFile.NODE_ENV ?? 'development' };
    const server = spawn('node', ['dist/main'], { cwd: work, env, stdio: ['ignore', 'pipe', 'pipe'] });
    let log = '';
    server.stdout.on('data', (d) => { log += d; });
    server.stderr.on('data', (d) => { log += d; });
    let exited: number | null = null;
    server.on('exit', (code) => { exited = code ?? 0; });

    let ok = false;
    for (let i = 0; i < 60 && exited === null; i++) {
      const h = await answers(`http://127.0.0.1:${port}/health`);
      if (h?.status === 200 && h.body.trim() === 'ok') { ok = true; break; }
      await new Promise((r) => setTimeout(r, 1000));
    }
    const embed = ok ? await answers(`http://127.0.0.1:${port}/embed.js`) : null;
    server.kill('SIGTERM');
    await new Promise((r) => setTimeout(r, 1000));
    if (exited === null) server.kill('SIGKILL');

    if (!ok) {
      console.log(exited !== null ? `node dist/main stopped by itself with code ${exited}. The last of what it said:` : '/health did not answer within a minute. The last of what the server said:');
      console.log(log.split('\n').slice(-15).join('\n'));
      return 1;
    }
    if (embed?.status !== 200) { console.log(`The server started, but /embed.js answered ${embed?.status ?? 'nothing'}.`); return 1; }
    console.log(`node dist/main started on port ${port}, /health answered "ok", /embed.js answered 200, and the server was stopped.`);
    return 0;
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

if (require.main === module) main().then((code) => { process.exitCode = code; }, (e) => { console.log(`The check could not run: ${e?.message ?? e}`); process.exitCode = 1; });
