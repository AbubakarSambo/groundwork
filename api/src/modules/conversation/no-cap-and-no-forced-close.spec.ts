import { readFileSync } from 'fs';
import { join } from 'path';
import * as aShortDay from './a-short-day';
import { A_SHORT_DAY, HOW_A_CHECK_IN_ENDS, HOW_SETUP_ENDS } from './a-short-day';
import { asItReadsOnWhatsApp } from './the-opening-line';

/**
 * Hafsah, after round 3 (26 October 2026) and in the standards (2 November 2026): no question limits and no forced close. It offers to
 * wrap up in its own words when the person seems done, they can carry on, and it can close when it has what it needs. Since 3 November
 * the twenty-answer ceiling, the turn floors and the scripted "Anything else I should know?" end are gone; a-short-day.ts is the one
 * owner of how a conversation ends.
 */
/* Comments are taken out first: the history of what was removed is told in comments, and only code is checked. */
const withoutComments = (t: string): string => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
const conversation = withoutComments(readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8'));
const entry = withoutComments(readFileSync(join(__dirname, '..', 'entry', 'entry.service.ts'), 'utf8'));

describe('no question limit and no forced close', () => {
  it('the check-in prompt says there is no limit on questions and nothing ends it on a count', () => {
    expect(HOW_A_CHECK_IN_ENDS).toMatch(/^HOW THIS CHECK-IN ENDS\. There is no limit on questions, and nothing ends it on a count\./);
    expect(HOW_SETUP_ENDS).toMatch(/^HOW SETUP ENDS\. There is no limit on questions, and nothing ends it on a count\./);
  });

  it('the model offers to wrap up in its own words, and they can carry on', () => {
    for (const how of [HOW_A_CHECK_IN_ENDS, HOW_SETUP_ENDS]) {
      expect(how).toMatch(/offer to wrap up in your own words/);
      expect(how).toMatch(/they can carry on if there is more/);
      expect(how).toMatch(/\[\[SESSION_COMPLETE\]\]/);
    }
    expect(HOW_A_CHECK_IN_ENDS).toMatch(/Do not use the same words each time/);
  });

  it('setup reads back what it set up and asks whether anything is wrong before it finishes', () => {
    expect(HOW_SETUP_ENDS).toMatch(/say back in plain full sentences what you have set up, from WHAT SETUP KNOWS above and nothing else, and ask "Is anything wrong\?"/); /* The heading is now WHAT SETUP KNOWS, the one reading (fix plan, group 5). */
  });

  it('both are said every turn, in code: the check-in with its system prompt, setup with its own', () => {
    expect(conversation).toMatch(/const fullSystem = \[[^\n]*HOW_A_CHECK_IN_ENDS\]/);
    expect(entry).toMatch(/\$\{HOW_SETUP_ENDS\}/);
  });

  it('there is no ceiling, no floor of answers and no scripted end in either service', () => {
    for (const src of [conversation, entry]) {
      expect(src).not.toMatch(/A_CHECK_IN_TAKES_ANSWERS|theCeilingIsReached|howMuchRoomIsLeft|room for \S+ more answers?/);
      expect(src).not.toMatch(/theFloorFor|A_CHECK_IN_IS_NOT_DONE_IN|AN_UPDATE_IS_NOT_DONE_IN|tooFewAnswersToFinish|NOT_ENOUGH_YET_TO_FINISH|mayCompleteAfter/);
      expect(src).not.toMatch(/Anything else I should know\?|ANYTHING_ELSE|whereTheEndStands|itIsTimeToClose|YOU_CAN_END_NOW|whereSetupEnds/);
    }
  });

  it('a-short-day.ts holds only the short day and the two ways a conversation ends', () => {
    expect(Object.keys(aShortDay).sort()).toEqual(['A_SHORT_DAY', 'HOW_A_CHECK_IN_ENDS', 'HOW_SETUP_ENDS']);
  });

  it('the WhatsApp copy no longer swaps in a scripted "reply END now" offer', () => {
    expect(asItReadsOnWhatsApp('Noted.\n\nThat sounds like everything for today. Shall we wrap up, or is there more?')).toBe('Noted.\n\nThat sounds like everything for today. Shall we wrap up, or is there more?');
  });

  it('something said outside the question is taken and filed, never pushed back', () => {
    expect(A_SHORT_DAY).toMatch(/If they say something outside your question, take it.*Never push them back to your question, and never cut them off/);
    expect(A_SHORT_DAY).not.toMatch(/5 TO 7|QUESTIONS IN ALL/);
  });
});
