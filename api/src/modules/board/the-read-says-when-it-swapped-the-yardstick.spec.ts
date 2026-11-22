import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * A SALESPERSON WAS READ AGAINST SUPPORT CRITERIA, AND NOTHING SAID SO.
 *
 * `detectFunction` lets the ACCOUNT outrank the stated title on purpose - a title can be wrong and
 * the record shows the real work - and it lowers confidence when the two clash. It writes the clash
 * into its `basis` string. The board printed the conclusion and dropped the basis.
 *
 * On a real twelve-session cohort that put a hire whose role read "New sales hire, outbound" under
 * "Read against Support and customer-facing work: on track here means named customers unblocked,
 * the repeated problem traced to a cause" - because her sessions were full of being blocked - while
 * two colleagues with near-identical role text were read against "Sales and expansion". Her lead
 * was deciding whether to keep her, against the criteria for a different job.
 *
 * The override is not the bug and stays. The silence was.
 */
const SRC = readFileSync(join(__dirname, 'reads.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('when the read is not the stated role', () => {
  it('compares the two rather than only printing the winner', () => {
    expect(SRC).toMatch(/const stated = priorFunctionFromRole\(p\.roleAsDescribed\)/);
    expect(SRC).toMatch(/if \(stated && stated\.fn !== p\.detectedFunction\)/);
  });

  it('and names what the title said, in the same words the other line uses', () => {
    expect(SRC).toMatch(/Their stated role reads as \$\{\(statedMap\?\.label/);
  });

  /** A lead who knows the title is right needs to be pointed at the difference, not past it. */
  it('and tells the reader what to do about the difference', () => {
    expect(SRC).toContain('If the title is right, that difference is the thing to look at first.');
  });

  it('and says nothing when the two agree', () => {
    const branch = SRC.slice(SRC.indexOf('const stated = priorFunctionFromRole'));
    expect(branch.slice(0, 400)).toMatch(/stated\.fn !== p\.detectedFunction/);
  });
});

/**
 * AND THE PARAGRAPH NO LONGER CONTRADICTS ITSELF.
 *
 * `peersWorkTogether` is a setting; `corroborations` is a count of the times somebody actually named
 * this person's work. Both conditions could fire, so one read said "7 of these were independently
 * named by someone else" and then, two sentences later, "Nobody else on this ground sees this
 * person's work, so there is no second account to check any of this against."
 */
describe('the no-second-account caveat', () => {
  it('only fires where there genuinely is no second account', () => {
    expect(SRC).toMatch(/if \(!peopleWorkTogether && completed >= 3 && corroborations === 0\)/);
  });

  it('and where there is one, says what that is worth instead', () => {
    /* "ground" is never on screen (release test, 21 November 2026, bug 41): the sentence says "a check-in". */
    expect(SRC).toContain('carries more than it would in a check-in where everybody watches everybody');
  });
});
