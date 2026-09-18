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
/*
 * THE RULE MOVED, AND THE MOVE IS THE POINT. It sat under PUSHBACK RULES inside the goal-alignment
 * section - which is the fallback for a situation with no prompt of its own, and all twenty-two
 * have one. So on every real conversation this rule was in the prompt and never reached: the
 * section around it is routed out before the turn is built (see only-the-rules-this-turn-needs).
 * It is a rule about any aim anybody gives you, so it now sits with the conversation quality rules
 * where every turn reads it. This reads it where it lives now.
 */
const RULES = SRC.slice(
  SRC.indexOf('AN AIM WITH A NOUN IN IT AND NO WAY TO TELL IT IS DONE IS STILL VAGUE:'),
  SRC.indexOf('WHEN SOMEBODY ASKS YOU FOR SOMETHING, GIVE THEM IT'),
);

describe('a noun is not a measure', () => {
  it('names the shape the earlier rule lets through', () => {
    expect(RULES).toContain('AN AIM WITH A NOUN IN IT AND NO WAY TO TELL IT IS DONE IS STILL VAGUE');
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

  /*
   * AND IT HAS TO BE SOMEWHERE EVERY TURN READS, which is what the move was for. The goal-alignment
   * section that used to hold it is left out of any conversation whose situation has a prompt of
   * its own, and all twenty-two do - so a rule in there is a rule nobody gets.
   */
  it('sits where every turn reads it, not inside the fallback interview', () => {
    const { ENGINE_RULES } = require('./prompt-library');
    const { onlyTheRulesThisTurnNeeds } = require('./only-the-rules-this-turn-needs');
    const anOrdinaryTurn = onlyTheRulesThisTurnNeeds(ENGINE_RULES, { hasASituationPack: true, sessionNumber: 3 });
    expect(anOrdinaryTurn).toContain('AN AIM WITH A NOUN IN IT AND NO WAY TO TELL IT IS DONE IS STILL VAGUE');
    expect(anOrdinaryTurn).toContain('NEVER CALL SUCH AN ANSWER CLEAR');
    /* The section it came out of is the one that does not survive that routing. */
    expect(anOrdinaryTurn).not.toContain('GOAL ALIGNMENT: the most important first conversation');
  });
});
