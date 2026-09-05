/**
 * WE RENAMED OUR OWN WORD AND TOOK THE CUSTOMER'S WITH IT.
 *
 * "Sprint" is engineering vocabulary for a two-week iteration, and the ops
 * system was using it for a dated list of companies — so it was renamed there,
 * correctly, with a script.
 *
 * The script reached the product. `when-words-mean-a-date.ts` recognises the
 * things people say instead of a date, and one of them is "next sprint" — said
 * by a customer, about their own two-week iteration, which is exactly what the
 * word means to them. Renaming it meant the product stopped recognising one of
 * the most common vague promises there is, and nothing failed: the tests were
 * renamed in the same pass.
 *
 * Caught by reading the diff of a rename, not by a test. So this is the test.
 *
 * OUR VOCABULARY IS NOT THEIRS. What we call our own list has no bearing on the
 * words a person types into a check-in, and a rename on our side must never
 * reach the engine that reads theirs.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { whenTheyMeant, askWhenTheyMean } from './when-words-mean-a-date';

const A_MONDAY = new Date('2026-09-07T09:00:00Z');

describe('a person who says "next sprint"', () => {
  it('is not given a date, because the product does not have their calendar', () => {
    expect(whenTheyMeant('next sprint', A_MONDAY)).toBeNull();
    expect(whenTheyMeant('this sprint', A_MONDAY)).toBeNull();
  });

  it('is asked when they mean, rather than passing silently', () => {
    expect(askWhenTheyMean('next sprint')).toBeTruthy();
  });

  it('still gets a real date when they give one, so the guard is not passing on everything', () => {
    expect(whenTheyMeant('friday', A_MONDAY)).not.toBeNull();
  });
});

describe('the list of things that are not dates', () => {
  /*
   * COMMENTS STRIPPED BEFORE MATCHING, and the meta-guard caught this file for
   * not doing it. The note explaining the rule sits inside the list it guards
   * and quotes the very phrase being banned, so a spec reading raw source fails
   * on the explanation while the code is correct — or, worse, passes on the
   * explanation once the code is wrong.
   */
  const SOURCE = readFileSync(join(__dirname, 'when-words-mean-a-date.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  it('carries no vocabulary of ours', () => {
    /*
     * "Target list" is what WE call our own thing. Nobody types it into a
     * check-in, and this list containing it means somebody renaming our words
     * reached into the engine that reads theirs.
     */
    const list = SOURCE.slice(SOURCE.indexOf('const NOT_A_DATE'), SOURCE.indexOf('];', SOURCE.indexOf('const NOT_A_DATE')));
    expect(list).not.toMatch(/target list/i);
    expect(list).toContain('next sprint');
  });
});
