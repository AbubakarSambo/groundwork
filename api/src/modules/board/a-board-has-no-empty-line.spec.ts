import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { aBoardWithNoEmptyLine } from './a-board-has-no-empty-line';
import { theRecordSections } from './the-kind-of-work';

/** Run-29: three kinds of empty line were served on boards. They are shown here as the run served them. */
const RUN = join(__dirname, '../../../journey/all-24/run-29');
/* A run's saved output is not in git, so on a computer without it the three run-29 cases are skipped, as the loans spec does. */
const haveTheRun = existsSync(join(RUN, 'sales.json'));
const run = (name: string) => JSON.parse(readFileSync(join(RUN, `${name}.json`), 'utf8'));
const itWithTheRun = haveTheRun ? it : it.skip;
const hasAnEmptyLine = (v: any): boolean => (Array.isArray(v) ? v.some(hasAnEmptyLine) : v && typeof v === 'object'
  ? Object.entries(v).some(([k, x]) => (['holds', 'when', 'view'].includes(k) && typeof x === 'string' && !x.trim()) || hasAnEmptyLine(x)) : false);

describe('a board never serves an empty line', () => {
  itWithTheRun('the board of a check-in whose kind of work is not known has no empty "holds" (the run-29 board)', () => {
    const served = run('board').sessions[0].board;
    expect(hasAnEmptyLine(served.workRecords)).toBe(true);
    const after = aBoardWithNoEmptyLine(served);
    expect(hasAnEmptyLine(after)).toBe(false);
    expect(after.workRecords).toHaveLength(6);
    expect(after.workRecords[0]).toEqual({ section: 'Deal grid', state: 'not-known', why: 'Groundwork does not know what kind of work this check-in is about yet, so it keeps no records of this kind.' });
  });

  it('the sections themselves are not made with an empty "holds"', () => {
    expect(theRecordSections(null, null, []).some((s: any) => 'holds' in s)).toBe(false);
  });

  itWithTheRun('a side of a difference with a name and no words is not served, and the sides with words stay (the run-29 sales board)', () => {
    const served = run('sales').sessions[0].participantBoard;
    expect(hasAnEmptyLine(served.divergence)).toBe(true);
    const after = aBoardWithNoEmptyLine(served);
    expect(hasAnEmptyLine(after)).toBe(false);
    expect(after.divergence.items[0].positions.map((p: any) => p.who)).toEqual(['Bisi Adeyemi', 'You']);
  });

  itWithTheRun('a row of "What was agreed at the start" with no step is on Day 1, so the screen draws it (the run-29 senior hire board)', () => {
    const served = run('seniorhire').sessions[2].participantBoard;
    expect(hasAnEmptyLine(served.startingState)).toBe(true);
    const after = aBoardWithNoEmptyLine(served);
    expect(hasAnEmptyLine(after)).toBe(false);
    expect(after.startingState.rows.map((r: any) => r.when)).toEqual(['Day 1', 'Day 1', 'Day 1', 'Day 1']);
  });

  /*
   * CHANGED 5 OCTOBER 2026, AND ONLY THE MATCH. This pinned the literal
   * `const asServed = aBoardWithNoEmptyLine(everyStoredSentenceReadsRight(`, so it went red the
   * moment request 152 wrapped the same expression in `everyActionHasALabel(...)` to stop an
   * action arriving with an empty label. The guarantee it exists for was never touched: the board
   * still goes through both, in the same order, with the label pass outside them.
   *
   * So it checks the composition rather than the first characters of the line. Anything may wrap
   * the pair; nothing may come between them, and nothing may serve the board around them.
   */
  it('the board is served through it, for every reader', () => {
    const src = readFileSync(join(__dirname, 'board.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(src).toContain('aBoardWithNoEmptyLine(everyStoredSentenceReadsRight(');
    expect(src).toMatch(/const asServed = [A-Za-z]*\(*aBoardWithNoEmptyLine\(/);
    /* The anchor's own parts (request 149) are added after it, so the board is held in `asServed` and returned with them. */
    /* And then the lead's own aim is walled off from a member of an anchor check-in (P13), around the same object. */
    expect(src).toContain('return withoutTheLeadsSetUpForAMember({ ...asServed,');
  });
});
