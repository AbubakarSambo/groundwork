import {
  theRoomJudgementTemplate, theJudgementTemplate, theRoom, theJudgementOverARoom,
  NEVER_A_PRONOUN_FOR_A_PERSON, A_PROMISE_IS_ASKED_ABOUT_BY_ITS_DAY, A_NUMBER_IS_ONE_A_BLOCK_HOLDS,
  EACH_THING_AS_STRONGLY_AS_THE_BLOCK_SAYS_IT, AN_OUT_OF_DATE_THING_IS_THE_FINDING, SOMEBODY_CREDITED_WHO_IS_NOT_IN_THE_ROOM, EVERY_PIECE_NOT_THE_FIRST_ONE,
} from './the-judgement-over-the-answers';

/**
 * THE JUDGEMENT'S PROMPT SAYS WHO, WHAT AND WHEN (requests 123 item 7, 134 item 4, 135 item 3; the run of 5 October).
 *
 * Read-side repairs for pronouns were tried and taken out, because each could put a false sentence about the lead on
 * the page. So the writer is told. This holds the three rules in place, holds every key element the prompt had before
 * (Hafsah: do not kill the key elements), and holds the run's own examples in the text: the crisis check-in's "7 AM
 * alerts" for an alert that fired at 02:14, and the snapshot's "your account does not show that they know it".
 */
const room = theJudgementOverARoom('whoever called this check-in', 'what to do next', 'Wairimu Kamau');

describe('the three rules are in the room judgement, and the pronoun rule in both', () => {
  it('the room prompt holds all three, before the plain-words rules', () => {
    for (const rule of [NEVER_A_PRONOUN_FOR_A_PERSON, A_PROMISE_IS_ASKED_ABOUT_BY_ITS_DAY, A_NUMBER_IS_ONE_A_BLOCK_HOLDS]) expect(room).toContain(rule);
    expect(room.indexOf(NEVER_A_PRONOUN_FOR_A_PERSON)).toBeLessThan(room.indexOf('HOW TO WRITE ANYTHING A PERSON WILL READ'));
  });
  it('the population prompt holds the pronoun rule', () => {
    expect(theJudgementTemplate()).toContain(NEVER_A_PRONOUN_FOR_A_PERSON);
  });
  it('the run\'s own examples are in the text', () => {
    expect(A_NUMBER_IS_ONE_A_BLOCK_HOLDS).toContain('fired at 02:14');
    expect(A_NUMBER_IS_ONE_A_BLOCK_HOLDS).toContain('never "the 7 AM alerts"');
    expect(A_NUMBER_IS_ONE_A_BLOCK_HOLDS).toContain('never "four activities"');
    expect(NEVER_A_PRONOUN_FOR_A_PERSON).toContain('your account does not show that they know it');
    expect(A_PROMISE_IS_ASKED_ABOUT_BY_ITS_DAY).toContain('whether the bundle was filed by Thursday 1 October');
  });
});

describe('the four rules from the runs of 5 October are in the room judgement', () => {
  const four = [EACH_THING_AS_STRONGLY_AS_THE_BLOCK_SAYS_IT, AN_OUT_OF_DATE_THING_IS_THE_FINDING, SOMEBODY_CREDITED_WHO_IS_NOT_IN_THE_ROOM, EVERY_PIECE_NOT_THE_FIRST_ONE];
  it('all four are in, before the plain-words rules, and name no scenario', () => {
    for (const rule of four) {
      expect(room).toContain(rule);
      expect(room.indexOf(rule)).toBeLessThan(room.indexOf('HOW TO WRITE ANYTHING A PERSON WILL READ'));
      expect(rule).not.toMatch(/Priya|Marcus|Victor|Meridian|Amara|crisis|recognition|shock/i);
    }
  });
  it('the room only: the population prompt, which counts, does not carry them', () => {
    for (const rule of four) expect(theJudgementTemplate()).not.toContain(rule);
  });
});

describe('nothing the prompt had before is lost', () => {
  it('every key element of the room and population prompts is still there', () => {
    /* The old text is the new text with the three rules taken out (checked against the commit before, when written). */
    const strip = (t: string) => t
      .replace(`${NEVER_A_PRONOUN_FOR_A_PERSON}\n\n`, '')
      .replace(`${A_PROMISE_IS_ASKED_ABOUT_BY_ITS_DAY}\n\n`, '')
      .replace(`${A_NUMBER_IS_ONE_A_BLOCK_HOLDS}\n\n`, '')
      .replace(`${EACH_THING_AS_STRONGLY_AS_THE_BLOCK_SAYS_IT}\n\n`, '')
      .replace(`${AN_OUT_OF_DATE_THING_IS_THE_FINDING}\n\n`, '')
      .replace(`${SOMEBODY_CREDITED_WHO_IS_NOT_IN_THE_ROOM}\n\n`, '')
      .replace(`${EVERY_PIECE_NOT_THE_FIRST_ONE}\n\n`, '');
    const roomOld = strip(theRoomJudgementTemplate());
    for (const key of ['THE ONE RULE: every sentence names a PERSON', 'NEVER MERGE TWO PEOPLE WHOSE REASONS DIFFER', "NOTHING IS ANYBODY'S FAULT UNLESS AN ACCOUNT SAYS SO",
      'A REASON IS ONLY A REASON IF SOMEBODY SAID IT', 'TWO FACTS SIDE BY SIDE ARE NOT A CAUSE', 'THE SAME THING IN TWO BLOCKS IS USUALLY THE FINDING',
      'NEVER DECIDE ABOUT A PERSON', 'FIVE THINGS, AND NOTHING ELSE', '{{theLeadLine}}']) expect(roomOld).toContain(key);
    for (const key of ['THE ONE RULE: every sentence you write contains a number that is in the table', 'FIVE THINGS, AND NOTHING ELSE']) expect(theJudgementTemplate()).toContain(key);
  });
});

describe('a promise reaches the writer as an action with its time', () => {
  it('as the block prints it', () => {
    const text = theRoom([
      { who: 'participant A', isLead: false, role: null, finding: null, patterns: [], openCommitments: [{ clause: 'file the bundle', when: 'Thursday 1 October' }, 'Ich werde es machen'] },
    ], [], 1);
    expect(text).toContain('said they would file the bundle, and the time they gave was "Thursday 1 October". Nobody has closed it.');
    expect(text).toContain('said they would, nobody has closed it: "Ich werde es machen"');
  });
});
