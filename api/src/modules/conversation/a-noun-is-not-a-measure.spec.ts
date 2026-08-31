import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * "FIND THE BUGS AND FIX THEM" WAS CALLED A CLEAR GOAL.
 *
 * The specificity rule pushes on an answer with no thing in it - no document, number, named person,
 * system state or decision. "Find the bugs and fix them" has a thing in it, so it passed, and there
 * is no way on earth to tell whether it happened: which bugs, how many, found by whom, what would
 * be true at the end that is not true now.
 *
 * The session then said "That's a clear goal", which is the worst moment to affirm: the person
 * believes their definition was accepted, the record holds something nobody can check, and every
 * later session measures against it.
 */
/*
 * COMMENTS STRIPPED FIRST, as the repository requires of every source-assertion spec: this file
 * quotes the rule it is checking inside its own explanation, so an unstripped match would find the
 * prose and pass while the rule was gone.
 */
const SRC = readFileSync(join(__dirname, 'prompt-library.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^\s*\/\/.*$/gm, '');
const RULES = SRC.slice(SRC.indexOf('PUSHBACK RULES:'), SRC.indexOf('REFUSAL RULE'));

describe('a noun is not a measure', () => {
  it('names the shape the earlier rule lets through', () => {
    expect(RULES).toContain('A THING IS NOT A MEASURE');
    expect(RULES).toContain('"Find the bugs and fix them" names a thing');
  });

  it('gives more than one example, so it is a shape rather than one sentence', () => {
    for (const e of ['improve the onboarding', 'clean up the backlog', 'get the tests passing']) {
      expect(RULES).toContain(e);
    }
  });

  it('says the three things such an answer is missing', () => {
    expect(RULES).toContain('no amount, no date and no way to tell it is done');
  });

  it('forbids affirming it, which is what actually happened', () => {
    expect(RULES).toContain('NEVER CALL SUCH AN ANSWER CLEAR');
    expect(RULES).toContain("that's a clear goal");
  });

  it('gives the test to apply before affirming anything', () => {
    expect(RULES).toContain('what would have to exist at the end for it to be met');
  });

  it('sits inside the pushback rules, where the rule it corrects lives', () => {
    expect(RULES.indexOf('A THING IS NOT A MEASURE')).toBeGreaterThan(-1);
    /* And before the refusal rules, which are a different count for a different situation. */
    expect(SRC.indexOf('A THING IS NOT A MEASURE')).toBeLessThan(SRC.indexOf('REFUSAL RULE'));
  });
});
