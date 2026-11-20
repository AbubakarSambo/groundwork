import * as fs from 'fs';
import * as path from 'path';

/**
 * WHAT THE SETUP CHAT SAID TO A REAL PERSON SETTING UP A NEW HIRE.
 *
 * Five lines, read off one run and quoted back:
 *
 *   "Nothing you write here is your official account of the situation."
 *   "Is this a one time check in, or will you be checking in regularly?"
 *      -> "is this about me or the other person"
 *   "The system is designed for both people to give their account."   (it is not)
 *   "My apologies for the confusion."
 *
 * Every one traces to an instruction in ONBOARD_SYSTEM, and two of them to instructions that were
 * FIGHTING the product: a rule banning the word "check-in" - the product's own word for the thing
 * a person opens - so the model had to describe what somebody was doing without naming it; and a
 * paragraph removing a third setup option, which the model generalised into "the system requires
 * both people", denying a configuration that has a button at the end of the same flow.
 */
/*
 * COMMENTS STRIPPED FIRST, per `a-guard-that-a-comment-satisfies-is-not-a-guard`. Every string
 * asserted below lives inside the ONBOARD_SYSTEM template literal, which carries no comments of
 * its own - so this cannot pass on an explanation of itself, which is the whole point of the rule.
 */
const SRC = fs
  .readFileSync(path.join(__dirname, 'entry.service.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');
const ONBOARD = (() => {
  const start = SRC.indexOf('const ONBOARD_SYSTEM =');
  if (start === -1) throw new Error('ONBOARD_SYSTEM is gone from entry.service.ts');
  return SRC.slice(start, SRC.indexOf('`;', start));
})();

describe('the setup chat', () => {
  it('may use the product\'s own word for the thing a person opens', () => {
    /* The rule that banned it is why the copy came out contorted. "ground" and "contributor" are
       still banned - those are ours, not theirs. */
    expect(ONBOARD).not.toMatch(/Never say "ground", "check-in"/);
    expect(ONBOARD).toMatch(/Never say "ground" or "contributor"/);
    expect(ONBOARD).toMatch(/"check-in" IS the product's own word/);
  });

  it('asks how long the situation runs, not whether the person will be checking in', () => {
    expect(ONBOARD).toMatch(/ASK IT ABOUT THE SITUATION, NEVER ABOUT THEM/);
    /*
     * Hafsah's own wording, 15 September 2026, read off the live setup: the question was right and
     * stopped too early. Somebody answering it does not yet know the dates, the cadence and the
     * context are theirs to change later, so the answer carries more weight than it should.
     */
    expect(ONBOARD).toMatch(/Is this a one-off check-in, or something that you will track over time\?/);
    /* Changed in batch 2, group 6 (S16): the tabs are named from the one constant, so a rename reaches setup too. */
    expect(ONBOARD).toMatch(/\$\{REFERENCES_AND_RESOURCES\} and \$\{PEOPLE_AND_SETUP\} tabs once this first conversation is done/);
    expect(ONBOARD).not.toMatch(/Context and Setup tabs/);
    /* One ask. The second sentence tells them where the rest lives; it is not a second question. */
    expect(ONBOARD).toMatch(/The second sentence is not a second ask/);
  });

  it('never says what this stage does not count as', () => {
    expect(ONBOARD).toMatch(/never tell them what this\s+does NOT count as/);
    expect(ONBOARD).toMatch(/Never call what they type here an account, official or otherwise/);
  });

  it('never denies a setup the product supports', () => {
    expect(ONBOARD).toMatch(/THAT IS A SUPPORTED SETUP\. SAY SO\./);
    /* And states the trade rather than selling or refusing it. */
    expect(ONBOARD).toMatch(/there is nothing to compare it against/);
    expect(ONBOARD).toMatch(/Do not argue for it and\s+do not argue against it/);
  });

  it('and never apologises to somebody it confused', () => {
    expect(ONBOARD).toMatch(/NEVER APOLOGISE/);
    expect(ONBOARD).toMatch(/reassuring the software/);
  });
});
