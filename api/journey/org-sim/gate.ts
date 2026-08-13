/**
 * THE SHIPPING GATE, REPRODUCIBLE ON DEMAND. Stage 2, and F1 on the remaining list.
 *
 * The twelve-session run passed on 13 August, and that was a thing I did by hand: create a database,
 * migrate it, seed it, run the harness, read the log, count the lines. Nobody else could repeat it,
 * and a gate nobody can repeat is an anecdote.
 *
 *   npm run gate
 *
 * Fresh database, migrations from empty, seed, ground 1 through the real HTTP API against the live
 * model, then the assertions below. Exits non-zero if any of them fail, so it can sit in front of a
 * release.
 *
 * WHAT IT ASSERTS AND WHY EACH ONE IS HERE.
 *
 * Every check is something that has actually broken. A run that "passed" having completed one
 * session of twelve is in this file's history (G43), which is why the session count is asserted
 * rather than the exit code. Reports released is separate from sessions completed because a session
 * can finish and its report can fail to generate. Natural closes are counted as a band rather than
 * demanded exactly, because the model is in the loop and one check-in hitting the turn cap is
 * behaviour, not breakage - the product says so itself in the synthesis.
 *
 * NOT A SNAPSHOT TEST. It asserts shape and floors, never exact prose: the model writes different
 * words every run and a gate that fails on that teaches people to ignore it.
 */
import { execSync } from 'child_process';
import * as fs from 'fs';
import { assess, failuresIn, GROUND_1 } from './gate-assertions';

const OUT = process.env.OUT ?? 'journey/org-sim/out-gate';
const DB = process.env.GATE_DB ?? `gw_gate_${process.env.GATE_STAMP ?? 'local'}`;
const URL = `postgresql://${process.env.USER}@localhost:5432/${DB}?schema=public`;
const API_PORT = process.env.GATE_PORT ?? '3399';

/** The expectations live in `gate-assertions.ts`, where they can be tested. */
const GROUND = 1;

const sh = (cmd: string, env: Record<string, string> = {}) =>
  execSync(cmd, { stdio: 'inherit', env: { ...process.env, ...env } as any });

async function main() {
  console.log(`\nGate: ground ${GROUND}, ${GROUND_1.sessions} sessions, live model, database ${DB}.\n`);

  if (!process.env.GATE_REUSE_DB) {
    try { execSync(`dropdb --if-exists ${DB}`, { stdio: 'ignore' }); } catch { /* first run */ }
    sh(`createdb ${DB}`);
    sh('npx prisma migrate deploy', { DATABASE_URL: URL });
    sh('npx ts-node -T journey/org-sim/seed.ts', { DATABASE_URL: URL });
  }

  /**
   * The API has to be the built one on a port of its own. Running against whatever happens to be on
   * 3000 is how the first attempt at this verified a stale build and reported the old behaviour as
   * the new one.
   */
  sh('npx nest build');
  const api = require('child_process').spawn('node', ['--enable-source-maps', 'dist/main'], {
    env: { ...process.env, DATABASE_URL: URL, PORT: API_PORT, CONTEXT_ENABLED: 'true', CONFIDENCE_ENABLED: 'true' },
    stdio: ['ignore', 'ignore', 'ignore'],
    detached: false,
  });

  try {
    const deadline = Date.now() + 90_000;
    for (;;) {
      try {
        const res = await fetch(`http://localhost:${API_PORT}/api/v1/auth/methods`);
        if (res.ok) break;
      } catch { /* not up yet */ }
      if (Date.now() > deadline) throw new Error(`the API never came up on ${API_PORT}`);
      await new Promise(r => setTimeout(r, 2000));
    }
    console.log(`API up on ${API_PORT}.\n`);

    sh(`npx ts-node -T journey/org-sim/run-all.ts`, {
      DATABASE_URL: URL, OUT, ONLY: String(GROUND), ORG_SIM_API: `http://localhost:${API_PORT}/api/v1`,
    });
  } finally {
    api.kill('SIGKILL');
  }

  const grounds = JSON.parse(fs.readFileSync(`${OUT}/grounds.json`, 'utf8'));
  const findings = JSON.parse(fs.readFileSync(`${OUT}/findings.json`, 'utf8'));

  console.log('');
  const results = assess(grounds, findings, GROUND_1);
  for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.what}${r.ok ? '' : ` - ${r.detail}`}`);
  const fails = failuresIn(results);

  console.log('');
  if (fails.length) {
    console.log(`GATE FAILED - ${fails.length} of the checks above.\n`);
    process.exit(1);
  }
  console.log('GATE PASSED.\n');
}

main().catch(e => {
  console.error(`\nGATE ERRORED: ${e?.message ?? e}\n`);
  process.exit(1);
});
