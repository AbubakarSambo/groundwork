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

/**
 * Two, not three. grounds.cron.ts used to be the third: the auto-close sweep wrote COMPLETED itself
 * and was a second, thinner definition of finishing. It now hands the session to
 * ConversationService.closeByTheClock, so the write it made is gone and the file drops off this
 * list - which is the point of checking the list: a file that STOPS writing is as much a change as
 * one that starts.
 */
/*
 * ENTRY LEFT THIS LIST ON 15 SEPTEMBER 2026, AND THAT IS THE LIST WORKING.
 *
 * Commit used to mark the lead's session 1 COMPLETED from the setup transcript. It does not any
 * more - "the setup does not count as a leads first checkin. lead has to always do a first
 * checkin" - so there is no completion there to close a round for, and the file dropping off is
 * exactly what the comment above says to expect when a file stops writing.
 *
 * It goes back on the moment anything in entry writes a COMPLETED again, which is what the guard
 * below the list is for: a completion site missing from here fails.
 */
/*
 * ENTRY IS BACK ON THE LIST (7 October 2026). With the anchor switched on, entry.service.ts saves the lead's set-up conversation as a
 * COMPLETED, set-up session 1. It closes its round where every ground created there does, once the people are added (the one
 * recordRoundCompletion call after them), not at the write: at the write the party is not known yet, and a round counted then would be
 * closed at a count of one for good. The lead is managing only in the anchor, so her set-up is not what closes the round.
 */
const COMPLETION_SITES = [
  '../conversation/conversation.service.ts',
  '../entry/entry.service.ts',
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
    /*
     * One call per write, OR one call that comes after every write. The commit in entry.service.ts writes COMPLETED in one
     * of two branches that never both run (the anchor's set-up session, or the lead's first check-in by decision 133), and
     * one recordRoundCompletion after the people are added closes the round for either (changed 14 October; the count
     * rule could not see that the two writes are alternatives).
     */
    const eachWriteIsFollowedByAClose = writes.every((w) => src.indexOf('recordRoundCompletion(', w.index!) > -1);
    expect(calls.length >= writes.length || eachWriteIsFollowedByAClose).toBe(true);
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
        return [...src.matchAll(/status:\s*CheckInStatus\.COMPLETED/g)].some((m) => {
          const before = src.slice(Math.max(0, m.index! - 260), m.index!);
          /*
           * A `data: {` ANYWHERE IN THE LAST 260 CHARACTERS WAS NOT THE SAME OBJECT.
           *
           * This read "is there a data block near here" and called that a write. An unrelated
           * update two lines above a plain `where: { status: COMPLETED }` READ was enough to
           * name the file a completion site - which happened the moment reports.service.ts
           * started writing the share choice next to a query that counts completed check-ins
           * (23 September 2026).
           *
           * A write is `data: { ... COMPLETED`, so the `data:` is the LAST of the two openers
           * before the match. A read is `data: {...}); ... where: { ... COMPLETED`, where a
           * `where:` has opened since. Comparing their positions tells them apart exactly, and
           * a real completion site - `update({ where: {...}, data: { status: COMPLETED } })` -
           * still has its `data:` last, so nothing this guard exists for stops being caught.
           */
          const lastData = before.lastIndexOf('data: {');
          if (lastData === -1) return false;
          const lastWhere = Math.max(before.lastIndexOf('where: {'), before.lastIndexOf('where: {\n'));
          return lastData > lastWhere;
        });
      })
      .map((f: string) => f.split('/src/')[1]);

    const known = COMPLETION_SITES.map((r) => join(__dirname, r).split('/src/')[1]).sort();
    expect(files.sort()).toEqual(known);
  });
});
