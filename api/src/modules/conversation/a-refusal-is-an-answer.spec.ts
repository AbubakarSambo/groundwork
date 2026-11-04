import * as refusal from './a-refusal-is-an-answer';
import { recordAndMoveOn, whatTheAbsenceMeans } from './a-refusal-is-an-answer';

/** Ngozi, run 6: asked for the individual targets three times, then what she would do about it, twice. */
describe('a refusal is an answer', () => {
  it('says what the absence means, to the person', () => {
    expect(whatTheAbsenceMeans('who is responsible for which part of that plan')).toBe('Then this record shows nothing on who is responsible for which part of that plan.');
    expect(whatTheAbsenceMeans('what is clear and what is not')).toBe('Then this record shows nothing on what is clear and what is not.');
    expect(whatTheAbsenceMeans('what this is trying to achieve')).toBe('Then this record shows nothing on what this is trying to achieve.');
    expect(whatTheAbsenceMeans('the part of the plan that is theirs to do')).toBe('Then this record shows nothing on the part of the plan that is yours to do.');
  });
  /* Changed 4 November 2026 (release batch 1): the direct morning's words are the only words, so a refusal is "Understood." and the
     next question, and with nothing left to ask, "Thank you, that is noted." Nothing is said about how the record will read. */
  it('and moves to the next thing: the plan\'s question, else the next owed thing, else nothing', () => {
    expect(recordAndMoveOn({ question: 'What did the credit review on Friday decide?' })).toBe('Understood. What did the credit review on Friday decide?');
    expect(recordAndMoveOn({ owed: 'what they need from other people' })).toBe('Understood. What do you need from other people?');
    expect(recordAndMoveOn({})).toBe('Thank you, that is noted.');
  });
  /* 3 November 2026 (Hafsah: no forced close): the product no longer holds a close with "Nothing said this time carries a date ..." or
     "No decision from you is on this record yet ...". */
  it('no product-written line is put on a close any more', () => {
    expect(Object.keys(refusal)).not.toContain('NOTHING_HERE_HAS_A_NUMBER');
    expect(Object.keys(refusal)).not.toContain('NO_DECISION_YET');
  });
});
