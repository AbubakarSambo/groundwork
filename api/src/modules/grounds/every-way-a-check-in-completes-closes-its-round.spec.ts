import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * FOUR PLACES WRITE A CHECK-IN TO COMPLETED. ALL FOUR MUST ASK.
 *
 * The round-closing rule is correct and tested in a-round-closes-once.spec.ts. That is not the
 * failure worth guarding: the failure is a fifth completion path being added later that never calls
 * it, which produces a ground whose round silently never closes and a report that is never
 * delivered. Nothing about that looks broken - the session completes, the person sees their
 * artifact, and only the round is missing.
 *
 * So this reads the source for writes of COMPLETED and requires each file that performs one to also
 * call recordRoundCompletion. Comments are stripped first: this repository quotes code inside its
 * own explanations, and a scanner that counts prose is a guard a comment can satisfy. See
 * a-guard-that-a-comment-satisfies-is-not-a-guard.spec.ts.
 */
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const COMPLETION_SITES = [
  '../conversation/conversation.service.ts',
  '../entry/entry.service.ts',
  './grounds.cron.ts',
];

describe('every way a check-in completes closes its round', () => {
  it.each(COMPLETION_SITES)('%s calls recordRoundCompletion for each COMPLETED it writes', (rel) => {
    const src = strip(readFileSync(join(__dirname, rel), 'utf8'));

    /* Writes, not reads: `status: CheckInStatus.COMPLETED` inside a data block. A `where` clause
       filtering on COMPLETED is a query and closes nothing. */
    const writes = [...src.matchAll(/status:\s*CheckInStatus\.COMPLETED/g)].filter((m) => {
      const before = src.slice(Math.max(0, m.index! - 260), m.index!);
      return /\bdata:\s*\{/.test(before) && !/\bwhere:\s*\{[^}]*$/.test(before);
    });
    expect(writes.length).toBeGreaterThan(0);

    const calls = [...src.matchAll(/recordRoundCompletion\(/g)];
    expect(calls.length).toBeGreaterThanOrEqual(writes.length);
  });

  it('and no completion site is missing from this list', () => {
    /* The list above is the thing that rots. If a new file starts writing COMPLETED and is not
       named here, this file passes while guarding nothing - so the set of files is checked too. */
    const { execSync } = require('child_process');
    const out = execSync(
      `grep -rl "status: CheckInStatus.COMPLETED" ${join(__dirname, '../..')} --include=*.ts || true`,
      { encoding: 'utf8' },
    );
    const files = out
      .split('\n')
      .filter(Boolean)
      .filter((f: string) => !f.endsWith('.spec.ts'))
      .filter((f: string) => {
        const src = strip(readFileSync(f, 'utf8'));
        return [...src.matchAll(/status:\s*CheckInStatus\.COMPLETED/g)].some((m) =>
          /\bdata:\s*\{/.test(src.slice(Math.max(0, m.index! - 260), m.index!)),
        );
      })
      .map((f: string) => f.split('/src/')[1]);

    const known = COMPLETION_SITES.map((r) => join(__dirname, r).split('/src/')[1]).sort();
    expect(files.sort()).toEqual(known);
  });
});
