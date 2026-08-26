import * as fs from 'fs';
import * as path from 'path';

/**
 * DO NOT PROMISE WHAT YOU WILL DO WITH PEOPLE WHO ARE NOT THERE.
 *
 * OBSERVED LIVE in the setting-up flow. Told about a briefing for three people, the interview replied
 * "when I check in with each of them, I will be listening for whether they state, in their own words,
 * that the first move is to acknowledge the delay". At that moment no participant existed, nobody had
 * been named, and no invitation had been sent - invitations come at the END of this flow.
 *
 * WHY IT MATTERS MORE THAN IT LOOKS. The promise happened to come true, because the person named three
 * people a turn later. That is luck, not correctness. And the cost is not the promise: it is that this
 * product's entire claim is that it holds what was actually said, so a session that speaks confidently
 * about things it has no basis for teaches its reader to discount everything else in it.
 *
 * THE FIX IS KEYED ON STATE, NOT ON GOOD BEHAVIOUR. The block is rendered only where OTHER_PARTIES is
 * absent, so it cannot suppress legitimate talk about people who really are on the record.
 */
const SRC = fs
  .readFileSync(path.join(__dirname, 'prompt-library.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

describe('no promise about people who are not there', () => {
  /** The branch: present when there is a roster, the warning when there is not. */
  const branch = (() => {
    const i = SRC.indexOf('OTHER_PARTIES: ${ctx.otherParties');
    expect(i).toBeGreaterThan(-1);
    return SRC.slice(i, i + 1800);
  })();

  it('warns only where nobody is on the record', () => {
    expect(branch).toContain('NOBODY ELSE IS ON THE RECORD FOR THIS CHECK-IN YET');
  });

  it('names the exact phrase that was observed, so the model has something concrete to avoid', () => {
    expect(branch).toContain('when I check in with each of them');
  });

  /**
   * The failure mode of a rule like this is over-correction: a session too timid to ask about the
   * people the whole record is about. Asking must stay explicitly allowed.
   */
  it('still allows asking about the other people', () => {
    expect(branch).toMatch(/ASK WHO ELSE IS IN THIS/i);
  });

  /**
   * SETUP NOW LETS A LEAD FINISH WITHOUT NAMING ANYBODY - her call, because a required field somebody
   * cannot answer becomes a field they invent. That trade only works if the next conversation picks
   * the question up. This is where it gets picked up.
   */
  describe('and asks for the people setup let them skip', () => {
    it('asks who else is in this', () => {
      expect(branch).toMatch(/ASK WHO ELSE IS IN THIS, ONCE, EARLY/i);
    });

    /** The founding failure of the whole roster problem: a group offered where a person was needed. */
    it('rules out a group as an answer, by name', () => {
      expect(branch).toMatch(/"my team" is not/i);
    });

    /**
     * The failure mode of a question the product cares about is that it is asked every turn. Their
     * session is not a form, and "only me" has to end it.
     */
    it('asks once, and takes only-me for an answer', () => {
      expect(branch).toMatch(/Ask ONCE/);
      expect(branch).toMatch(/only them, that is a real answer/i);
    });

    /**
     * NOTHING IN THIS CONVERSATION ADDS ANYBODY. The entry flow has a mentioned-people capture with an
     * "add them" affordance; a ground check-in has none, so a name said here reaches no roster on its
     * own. Saying so is the difference between a prompt and a promise.
     */
    it('says the names do not add themselves', () => {
      expect(branch).toMatch(/they add the people themselves afterwards/i);
    });
  });
});
