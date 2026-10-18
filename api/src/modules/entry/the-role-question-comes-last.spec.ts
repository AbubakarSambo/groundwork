import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * THE ROLE QUESTION USED TO BE THE FIRST THING SETUP ASKED. IT IS NOW THE LAST, AND THE SCREEN ASKS IT.
 *
 * This file replaces `the-role-comes-first.spec.ts`, which held the opposite rule and held it for
 * good reasons at the time. Both the reasons have gone:
 *
 * THE FIRST REASON WAS THAT IT DECIDED WHAT EVERY WORD AFTER IT WAS - a party's words are their own
 * account, a non-party's are context about other people. That rested on a third answer, "somebody
 * else sets the context and you are only setting this up and inviting them". That answer has been
 * removed: it produced a check-in belonging to nobody in the room. Both remaining answers write
 * their own context, so setup's words are the context either way and nothing about them changes
 * with the answer.
 *
 * THE SECOND REASON IS WHY IT HAD TO MOVE, and it came from watching it: "we have 22 scenarios and
 * they all start the same, new hire does not ask you about the new hire". Whatever card somebody
 * clicked, the first thing back was a question about org structure that would have fitted any
 * situation on the list. The click appeared to go nowhere. The first question belongs to the
 * situation; the org question belongs at the end, where it is a question about what happens next.
 *
 * WHERE IT IS ASKED NOW: the screen, with two buttons, once setup is done - her call, in her words:
 * "you either set the context to checkin or set it and other checkin, you just look at the reports".
 * One place asking it, not a model and a form both having a go.
 */
const SRC = readFileSync(join(__dirname, 'entry.service.ts'), 'utf8')
  /* A guard a comment satisfies is not a guard, and the prose above this prompt discusses every
     phrase below. Comments out before anything is asserted. */
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

const ONBOARD = (() => {
  const at = SRC.indexOf('const ONBOARD_SYSTEM');
  expect(at).toBeGreaterThan(0);
  return SRC.slice(at, SRC.indexOf('const EXTRACT_SYSTEM'));
})();

describe('the role question comes last, and not from the model', () => {
  it('tells the model not to ask it at all', () => {
    expect(ONBOARD).toMatch(/WHO WRITES THE OBJECTIVE AND WHO CHECKS IN AGAINST IT IS NOT YOUR QUESTION\. DO NOT ASK IT\./);
    expect(ONBOARD).toMatch(/Never ask for it, never offer the\s+options/);
  });

  it('and does not make it a condition of finishing, which would strand everybody', () => {
    /* The gate used to return false without it. Model stops asking + gate still waiting = setup that
       never finishes for anyone. Held here as well as in the gate's own spec because the two have to
       change together and this is the file that would notice one of them moving back. */
    expect(ONBOARD).toMatch(/never make it a condition of finishing/);
  });

  it('still takes the answer if somebody volunteers it', () => {
    /* Not asking is not the same as not listening. Somebody who says "I am not part of this, I just
       set them up" has told us, and asking again with buttons would be the not-heard bug in reverse. */
    expect(ONBOARD).toMatch(/if they volunteer where they sit, take it and move on/i);
  });

  it('opens on the situation instead', () => {
    expect(ONBOARD).toMatch(/THE SITUATION ITSELF, STARTING WITH THE QUESTION THAT SITUATION DESERVES/);
    expect(ONBOARD).toMatch(/DO NOT ASK THEM WHAT THE SITUATION IS ABOUT/);
  });

  it('and the situation comes before anything else in the prompt', () => {
    /* Ordering inside the prompt is the thing being protected: a rule about the situation placed
       after four other numbered items is a rule the model reads as fourth. */
    expect(ONBOARD.indexOf('THE SITUATION ITSELF')).toBeLessThan(ONBOARD.indexOf('2. mode:'));
  });

  it('says no intro line at all about this stage, and still never calls it an account', () => {
    /*
     * This used to pin "These few questions just work out what kind of situation this is. Then you
     * go into your own check-in...", a line the model said just before setup carried on into the
     * lead's first check-in. Hafsah, 11 October 2026: remove it, no intro line at all. So the
     * prompt must no longer hold it, nor any instruction to say what comes next.
     */
    expect(ONBOARD).not.toMatch(/These few questions just work out/i);
    expect(ONBOARD).not.toMatch(/go into your own\s+check-in/i);
    expect(ONBOARD).not.toMatch(/SAY WHAT THIS STAGE IS/);
    expect(ONBOARD).toMatch(/NO INTRO LINE AT ALL/);
    /* And the disclaimer framing is banned outright, because it is what the model reached for. */
    expect(ONBOARD).toMatch(/Never call what they type here an account/);
  });

  it('and never tells somebody the product cannot run without their own account', () => {
    /*
     * Asked live: "I do not want to check in, I want to set the context and she checks in against
     * it." The answer was "the system is designed for both people to give their account", which is
     * false - running a check-in without giving one of your own is a button at the end of setup and
     * always has been.
     */
    expect(ONBOARD).toMatch(/THAT IS A SUPPORTED SETUP/);
    expect(ONBOARD).toMatch(/they set the context and the other person answers/);
  });

  it('and no longer offers handing the context to somebody else', () => {
    expect(ONBOARD).toMatch(/there is nobody to hand it to any more/);
    expect(ONBOARD).toMatch(/whoever knows what this is about\s+should be the one setting it up/);
  });
});
