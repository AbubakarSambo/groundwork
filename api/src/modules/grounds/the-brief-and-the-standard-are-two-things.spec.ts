import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { contextGaps } from './the-context-chat';

/**
 * THE BRIEF AND THE STANDARD ARE TWO DIFFERENT THINGS AND SHARED ONE COLUMN.
 *
 * The brief is what this check-in is FOR, in the lead's own words, shown to everybody at the top of
 * their check-in. What doing well looks like is what people are READ AGAINST - it lives in
 * `GroundBaseline`, versioned, with a reason when it changes, because the schema's own guardrail is
 * that a moved goal must never erase a record.
 *
 * The context conversation ran its whole success gap on the brief: it asked "what does doing well
 * look like here?" only when the BRIEF was empty, and then wrote the answer INTO the brief. Both
 * halves broke something.
 *
 *   - The brief every party reads became a success statement. On a real check-in it read "You have
 *     two standards for Zainab's first quarter. One you told her in week one; the other you have
 *     never written down and doubt she knows about" - the lead's own private account, published to
 *     the team as the description of the work.
 *   - `successLooksLike`, the column the report and the board read, was never written from the chat
 *     at all. A lead who used the conversation had no standard recorded anywhere.
 *   - And a lead who HAD written a brief was never asked what success looks like, because the gap
 *     believed the question was already answered.
 */
const SRC = readFileSync(join(__dirname, 'grounds.service.ts'), 'utf8');
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const base = {
  timelineDays: 90, cadence: 'WEEKLY', partyCount: 2,
  perPersonObjectiveCount: 3, openDocumentCount: 2, targetCount: 1, scenario: 'NEW_PROJECT',
};

describe('the success gap reads and writes the standard, never the brief', () => {
  it('asks what doing well looks like when the standard is missing', () => {
    expect(contextGaps({ ...base, successLooksLike: null }).map((g) => g.key)).toContain('success');
  });

  it('and still asks it when a brief exists, because a brief is not a standard', () => {
    /* The regression that hid the whole thing: a lead who described the work was treated as having
       said what doing well looks like, and never asked again. */
    expect(contextGaps({ ...base, successLooksLike: null }).map((g) => g.key)).toContain('success');
    expect(contextGaps({ ...base, successLooksLike: 'Margaret is running her own pipeline.' }).map((g) => g.key))
      .not.toContain('success');
  });

  it('the shape has no brief at all, so it cannot be read by accident', () => {
    expect(Object.keys(contextGaps({ ...base, successLooksLike: null })[0] ?? {})).not.toContain('brief');
  });
});

describe('accepting the answer writes a baseline version, not the brief', () => {
  /** The accepted-proposal branch, bounded by its own return. */
  const BRANCH = (() => {
    const code = strip(SRC);
    const i = code.indexOf("return { changed: 'success'");
    expect(i).toBeGreaterThan(-1);
    return code.slice(Math.max(0, i - 1200), i);
  })();

  it('creates a GroundBaseline rather than updating ground.brief', () => {
    expect(BRANCH).toMatch(/groundBaseline\.create/);
    expect(BRANCH).toMatch(/successLooksLike: proposal\.text/);
    expect(BRANCH).not.toMatch(/data: \{ brief: proposal\.text \}/);
  });

  /**
   * A new version, never an edit. The table's own comment: a goal change is a new chapter with a
   * marked transition, and must never become a way to erase somebody's record.
   */
  it('as a new version, carrying the conditions forward untouched', () => {
    expect(BRANCH).toMatch(/version: \(latestBaseline\?\.version \?\? 0\) \+ 1/);
    expect(BRANCH).toMatch(/conditions: \(latestBaseline\?\.conditions/);
    expect(BRANCH).not.toMatch(/groundBaseline\.update|groundBaseline\.upsert/);
  });
});
