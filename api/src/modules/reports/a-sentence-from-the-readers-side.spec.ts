import { youComeFirst, theReaderIsNotThey, fullNameOnce, fromTheReadersSide } from './a-sentence-from-the-readers-side';

/**
 * WHAT NATHAN READ ON 25 SEPTEMBER 2026, AFTER NAMES HAD GONE BACK IN.
 *
 *   "Both Caroline Mensah and you have answered. They disagree on what the performance target is."
 *   "Caroline Mensah says the target was five. Caroline Mensah says you are not meeting it."
 *   "You say you were told the target was five renewals, and has completed six."
 *
 * He is one of the two people. He is second in his own report, excluded by "They" from a
 * disagreement he is half of, told his colleague's full name twice in two sentences, and given a
 * verb that does not agree with him.
 *
 * None of it can be the model's job: the report is written once in labels and rendered per reader,
 * so at the moment it is written there is no side to write from.
 */
const NAMES = ['Caroline Mensah', 'Nathan Owusu'];

describe('the reader comes first in their own report', () => {
  it('"Both X and you have" becomes "You and X have both"', () => {
    expect(youComeFirst('Both Caroline Mensah and you have answered.'))
      .toBe('You and Caroline Mensah have both answered.');
  });

  it('and a pair with no "both" is still reordered', () => {
    expect(youComeFirst('Caroline Mensah and you agree on the number.'))
      .toBe('You and Caroline Mensah agree on the number.');
  });

  it('but a list of three is left alone, because reordering it is a bigger rewrite than this may make', () => {
    const t = 'Ada Nwosu, Tunde Bakare and you have all answered.';
    expect(youComeFirst(t)).toBe(t);
  });
});

describe('the reader is not "they"', () => {
  it('a group pronoun about a set the reader is inside becomes "you"', () => {
    expect(theReaderIsNotThey('You and Caroline have both answered. They disagree on the target.'))
      .toBe('You and Caroline have both answered. You disagree on the target.');
  });

  it('and a sentence about other people keeps its "they"', () => {
    const t = 'Caroline Mensah and Nathan Owusu both answered. They disagree.';
    expect(theReaderIsNotThey(t)).toBe(t);
  });
});

describe('a full name once, then the first name', () => {
  it('introduces the person, then uses their first name', () => {
    expect(fullNameOnce('Caroline Mensah says the target was five. Caroline Mensah says you are behind.', NAMES))
      .toBe('Caroline Mensah says the target was five. Caroline says you are behind.');
  });

  it('but two people who share a first name keep their full names throughout', () => {
    const two = ['Caroline Mensah', 'Caroline Adeyemi'];
    const t = 'Caroline Mensah says one thing. Caroline Mensah says another. Caroline Adeyemi disagrees.';
    expect(fullNameOnce(t, two)).toBe(t);
  });
});

/*
 * THE RULE THESE CASES COVERED HAS BEEN TAKEN OUT, AND THE CASES WITH IT.
 *
 * `andTheVerbAgrees` conjugated a third-person verb joined on with "and" in a sentence beginning
 * with "You". The five cases here all passed. Two sentences it was never shown did not, and both
 * were read off the lead's own board:
 *
 *   "You believe the team is behind on a collective goal for one reason, but the record shows each
 *    person is working on an individual goal and ARE blocked by a different problem."
 *
 *   "You say the office move is going well and ARE on schedule."
 *
 * The subject is "each person" and "the office move". Both sentences were correct before the rule
 * ran and wrong after it, so the rule was making new grammar mistakes on a page a lead reads. A
 * regular expression cannot tell which noun a verb belongs to, so there is nothing to narrow.
 *
 * The three rules that remain are unchanged and still covered above. The "you is / you was /
 * you has / you does" rule in `withNames` is a different rule and stays: its verb sits immediately
 * after "you", so the subject is not in doubt.
 */

describe('all of it together, on the real paragraph', () => {
  it('turns what Nathan read into what he should have read', () => {
    const was = 'Both Caroline Mensah and you have answered. They disagree on the target. '
      + 'Caroline Mensah says the target was five renewals. You have completed six.';
    expect(fromTheReadersSide(was, NAMES)).toBe(
      'You and Caroline Mensah have both answered. You disagree on the target. '
      + 'Caroline says the target was five renewals. You have completed six.',
    );
  });

  it('and leaves a picture with no reader in it exactly as it was', () => {
    const t = 'Caroline Mensah and Nathan Owusu have both answered. They disagree on the target.';
    expect(fromTheReadersSide(t, NAMES)).toBe(t);
  });
});
