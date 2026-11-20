import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * A LEAD WHO RUNS A CHECK-IN WITHOUT TAKING PART STILL HAS TO SAY WHAT THEY EXPECT. GW-EXP-6.
 *
 * THE HOLE THIS CLOSES. Everything built for expectations - the lead's per-person interview, the
 * awareness probe, the extraction, publishing to Context, the gap probe in later sessions - hangs off
 * the lead having a conversation. A managing-only lead had none: `if (!managingOnly)` skipped the row
 * in `create`, and `confirmLead` returned `checkInId: null`. So on precisely the grounds most likely
 * to need an expectation - the ones somebody set up to RUN rather than to take part in - every one of
 * those features was dead, and nothing said so.
 *
 * THE DISTINCTION THAT MAKES IT SAFE. Setting up is not testifying. A setup conversation asks what
 * this is aiming at and what is expected of each person; it is not an account of events and must
 * never be counted as one. So it is MARKED (`isSetup`) rather than inferred, because the arithmetic
 * it has to stay out of lives in several places and a flag is checkable where a convention is not.
 */
/* Comments stripped first: a guard a comment satisfies is not a guard. */
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const SERVICE = strip(readFileSync(join(__dirname, 'grounds.service.ts'), 'utf8'));

describe('GW-EXP-6: the conversation exists either way', () => {
  it('create() no longer skips the row for a managing-only lead', () => {
    const create = SERVICE.slice(SERVICE.indexOf('async create('), SERVICE.indexOf('async createForLead('));
    expect(create).not.toMatch(/if \(!managingOnly\) \{/);
    /* Everyone does a first check-in: the managing-only lead's session 1 is a real session. */
    expect(create).toMatch(/isSetup: false/);
  });

  it('confirmLead() returns an id to open rather than null', () => {
    const confirm = SERVICE.slice(SERVICE.indexOf('async confirmLead('), SERVICE.indexOf('async confirmLead(') + 4000);
    expect(confirm).toMatch(/isSetup: false/);
    expect(confirm).not.toMatch(/checkInId: null/);
  });

  it('and a lead who IS a party gets an ordinary session, not a setup one', () => {
    /** The other half. `isSetup: managingOnly` is false for them, which is the whole point of it. */
    const create = SERVICE.slice(SERVICE.indexOf('async create('), SERVICE.indexOf('async createForLead('));
    /* Everyone does a first check-in: the managing-only lead's session 1 is a real session. */
    expect(create).toMatch(/isSetup: false/);
    expect(create).not.toMatch(/isSetup: managingOnly/);
  });
});

describe('GW-EXP-6: but it is not a session', () => {
  it('every count on the list page excludes it', () => {
    /**
     * `roundsDone` requires EVERY row for a session number to be complete, and a setup row shares
     * session number 1 with everybody's first account - so left in, round one could never finish and
     * the check-in would read as permanently overdue.
     */
    /**
     * The end anchor is searched FROM the start anchor. `lastActivity` occurs earlier in this file for
     * an unrelated reason, so an unanchored `indexOf` sliced backwards and produced an empty string -
     * which every `toMatch` below then failed against, correctly but for the wrong reason.
     */
    const at = SERVICE.indexOf('const sessions = checkIns.filter');
    const list = SERVICE.slice(at, SERVICE.indexOf('const lastActivity', at));
    expect(list).toMatch(/const sessions = checkIns\.filter\(ci => !\(ci as any\)\.isSetup\)/);
    expect(list).toMatch(/const overdue = sessions\.filter/);
    expect(list).toMatch(/const checkInsToday = sessions\.filter/);
    /*
      AND THE ROUND COUNT, WHICH LIVES IN ITS OWN FILE NOW.

      This read `const roundsDone` out of THIS service, so it failed the moment the arithmetic moved
      to how-a-check-in-is-going.ts - where the board and the boards page now read it from too. The
      rule never changed: a setup row is not a session, and a round is done only when every party's
      row for it is completed. It is asserted where the rule lives, which is also the only place it
      can now be broken (the-sessions-done.ts since 12 November; the board, People and setup and a person's page all read it).
    */
    const GOING = strip(readFileSync(join(__dirname, 'the-sessions-done.ts'), 'utf8'));
    expect(GOING).toMatch(/\.filter\(\(ci\) => !ci\.isSetup\)/);
    expect(GOING).toMatch(/const numbers = \[\.\.\.new Set\(sessions\.map/);
    expect(GOING).toMatch(/sessions\.filter\(\(ci\) => ci\.sessionNumber === n\)/);
    /** And the old form, which counted every row including a setup one, is gone. */
    expect(GOING).not.toMatch(/new Set\(checkIns\.map/);
  });

  it('and both list queries select the flag, or the filter is silently false', () => {
    /**
     * Two sibling queries feed the same array. When only one selected `isSetup`, TypeScript caught it -
     * but had the field been optional, the filter would have quietly kept every row instead.
     */
    /*
     * MATCHED ON THE FIELD, NOT ON WHAT FOLLOWS IT.
     *
     * This read `/createdAt: true, isSetup: true \}/` - the flag AND the closing brace - so it
     * asserted that `isSetup` is the LAST thing in the select. Adding `availableFrom` after it broke
     * this test while leaving its meaning perfectly intact, which is a guard failing for a reason
     * it does not care about. The rule is that both list queries select the flag; where it sits in
     * the object is not the rule.
     */
    const selects = SERVICE.match(/select:\s*\{[^}]*participantId:\s*true[^}]*sessionNumber:\s*true[^}]*\}/g) ?? [];
    const listSelects = selects.filter(sel => /createdAt:\s*true/.test(sel));
    expect(listSelects.length).toBeGreaterThanOrEqual(2);
    expect(listSelects.filter(sel => !/isSetup:\s*true/.test(sel))).toEqual([]);
  });

  it('THE ONE THAT MATTERS: the report still cannot wait on it', () => {
    /**
     * The rule the old "no check-in at all" behaviour was really protecting. It survives because the
     * readiness check filters at the PARTICIPANT level - a managing-only lead is excluded before any
     * check-in row is considered, so a setup conversation is invisible to it whether complete or not.
     *
     * If this ever became a check-in-level filter, a managing-only lead's unfinished setup would hold
     * the report open forever, which is the exact failure the exclusion was written for.
     */
    const ready = SERVICE.slice(SERVICE.indexOf('async isSessionReadyForReport('), SERVICE.indexOf('async isSessionReadyForReport(') + 2200);
    /* CHANGED 11 OCTOBER (decision 133): the filter is whoASessionCounts now, which still leaves the lead's set-up row out unless it was answered. */
    expect(ready).toMatch(/groundParticipant\.findMany\(\{[\s\S]{0,120}?whoASessionCounts\(sessionNumber, AN_ANSWER\)/);
  });
});
