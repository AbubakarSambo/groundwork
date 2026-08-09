import { countCheckableSpecifics } from './conversation.service';

/**
 * AN ABSENCE IS NOT AN ACHIEVEMENT - BUT IT MUST NOT ERASE ONE EITHER.
 *
 * GW-020, and the most damaging finding of the eighteen-ground run.
 *
 * `countCheckableSpecifics` splits text into clauses and refuses to count
 * anything inside a negated one, which is right: "nothing I can point to as
 * closed yet" contains the word "closed", and counting that as delivery once let
 * someone who delivered nothing score the same as someone who delivered all
 * quarter.
 *
 * But "and" was not a clause separator. So one negative word poisoned the entire
 * sentence, including the positive half:
 *
 *   "I closed 22 tickets in my first three weeks."                      ->  3
 *   "I closed 22 tickets in my first three weeks
 *    AND nothing has slipped past its date."                            ->  0
 *
 * The same achievement, scored three or zero depending on whether the person also
 * mentioned something that had NOT gone wrong. An entry counting zero specifics
 * is dropped as a non-answer, so those words never reached the record, and the
 * shared report then told the person's manager they had contributed nothing.
 *
 * "I did X and nothing broke" is how careful people report progress. The filter
 * systematically erased the accounts of anyone who reports that way, and rewarded
 * anyone who only stated positives.
 *
 * MEASURED, after the fact, in the eighteen-ground run's own database:
 *
 *   hafeezah@org.test | 16 completed sessions | 0 record entries
 *   kavon@org.test    |  7 completed sessions | 0 record entries
 *
 * Everyone else had hundreds. Hafeezah's ground was a performance improvement
 * plan - sixteen sessions of her side of it, gone, on the one record where a
 * missing account does the most harm. The empty PIP report was originally blamed
 * on the alignment label; this was the real cause.
 */

describe('a positive clause survives a negative one beside it', () => {
  it('counts the achievement even when the sentence also says what did not go wrong', () => {
    // THE REGRESSION. Verbatim from a real check-in.
    expect(
      countCheckableSpecifics('I closed 22 tickets in my first three weeks and nothing has slipped past its date.'),
    ).toBeGreaterThan(0);
  });

  it('scores it the same as the sentence without the reassurance', () => {
    const withReassurance = countCheckableSpecifics(
      'I closed 22 tickets in my first three weeks and nothing has slipped past its date.',
    );
    const without = countCheckableSpecifics('I closed 22 tickets in my first three weeks.');
    expect(withReassurance).toBe(without);
  });

  it('handles the other conjunctions people join a positive to a negative with', () => {
    for (const text of [
      'We shipped the v1 to three clients while none of the migrations broke.',
      'I ran 12 interviews although nobody has signed yet.',
      'Two teams are onboarded whereas no training material exists yet.',
    ]) {
      expect({ text, score: countCheckableSpecifics(text) }).toMatchObject({ score: expect.any(Number) });
      expect(countCheckableSpecifics(text)).toBeGreaterThan(0);
    }
  });

  it('still separates on the boundaries it always did', () => {
    // "Loop" is a proper noun in the positive half; the negative half adds none.
    expect(countCheckableSpecifics('Loop signed, nothing else closed')).toBe(1);
  });
});

describe('the original rule still holds - an absence is not an achievement', () => {
  it('counts nothing when every clause is negated', () => {
    expect(countCheckableSpecifics('nothing closed and nothing shipped')).toBe(0);
    expect(countCheckableSpecifics('no progress and no update this week')).toBe(0);
  });

  it('counts nothing for the stock non-answers', () => {
    for (const text of ['Nothing new to add for session 3', 'just a lot going on', 'same as before']) {
      expect({ text, score: countCheckableSpecifics(text) }).toMatchObject({ score: 0 });
    }
  });

  it('does not let a negated clause borrow specifics from a positive one', () => {
    // The point of clause-splitting: the 40 belongs to the shipped half, and the
    // "nothing" half must not inherit it.
    const positive = countCheckableSpecifics('We shipped 40 units.');
    const mixed = countCheckableSpecifics('We shipped 40 units and nothing else moved.');
    expect(mixed).toBe(positive);
  });
});
