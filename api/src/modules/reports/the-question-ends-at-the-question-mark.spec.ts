import { theQuestionOnly } from './the-question-ends-at-the-question-mark';

/**
 * THE THREE THAT CAME OFF A REAL RUN, kept verbatim so this cannot pass on an invented example.
 *
 * Each is the model narrating what answering the question will do for us, in our own vocabulary -
 * the closing options, the internal states - printed to somebody reading about their team.
 */
const FROM_THE_RUN: [string, string][] = [
  [
    "For these check-ins to be useful for promotion conversations, what is the shared definition of a contribution worth recording? Answering this will frame the choice now in front of you: grant the ask for a documented record, decline it, or set a clear milestone for 'not yet'.",
    'For these check-ins to be useful for promotion conversations, what is the shared definition of a contribution worth recording?',
  ],
  [
    'What is the shared strategic goal for this work, and what would need to be true for each of you to be clear on your part in achieving it? With a shared picture now emerging, the choice is whether it is clear enough to name the situation, or if more accounts are needed to proceed.',
    'What is the shared strategic goal for this work, and what would need to be true for each of you to be clear on your part in achieving it?',
  ],
  [
    'What is the specific outcome this program was intended to achieve, and what evidence would be needed to show that outcome has been reached? Answering this will help determine whether the cohort is on track, mixed, at risk, or if check-ins should continue.',
    'What is the specific outcome this program was intended to achieve, and what evidence would be needed to show that outcome has been reached?',
  ],
];

describe('the question ends at the question mark', () => {
  it.each(FROM_THE_RUN)('cuts what the model added after it', (raw, expected) => {
    expect(theQuestionOnly(raw)).toBe(expected);
  });

  it('and none of our own vocabulary survives, without a list of our words to check against', () => {
    /*
     * The point of the rule. Matching our vocabulary needs a list of it, and a list is only as good
     * as the leaks somebody has already seen. This holds for the next one too, in words nobody has
     * written down yet.
     */
    for (const [raw] of FROM_THE_RUN) {
      const out = theQuestionOnly(raw)!;
      for (const ours of ['grant the ask', 'at risk', 'more accounts', 'not yet', 'the choice']) {
        expect(out.toLowerCase()).not.toContain(ours);
      }
    }
  });

  it('leaves a question that was already only a question completely alone', () => {
    const clean = 'What would each of you need to see to call the handover done?';
    expect(theQuestionOnly(clean)).toBe(clean);
  });

  it('a compound question comes through whole, because that is the prompt\'s job and not this one\'s', () => {
    const two = 'What is the goal, and what evidence would show it?';
    expect(theQuestionOnly(two)).toBe(two);
  });

  it('and a value with no question mark is returned rather than emptied', () => {
    /* Still the model's answer. A reader is better served by an odd sentence than a blank panel. */
    expect(theQuestionOnly('Settle who owns the renewal.')).toBe('Settle who owns the renewal.');
    expect(theQuestionOnly('   ')).toBeNull();
    expect(theQuestionOnly(null)).toBeNull();
  });
});
