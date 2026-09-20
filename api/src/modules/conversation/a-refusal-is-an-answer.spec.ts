import { recordAndMoveOn, whatTheAbsenceMeans, NOTHING_HERE_HAS_A_NUMBER } from './a-refusal-is-an-answer';

/** Ngozi, run 6: asked for the individual targets three times, then what she would do about it, twice. */
describe('a refusal is an answer', () => {
  it('says what the absence means, to the person', () => {
    expect(whatTheAbsenceMeans('who is responsible for which part of that plan')).toBe('Then who is responsible for which part of that plan goes on this record as not given.');
    expect(whatTheAbsenceMeans('the part of the plan that is theirs to do')).toBe('Then the part of the plan that is yours to do goes on this record as not given.');
  });
  it('and moves to the next thing: the plan\'s question, else the next owed thing, else nothing', () => {
    expect(recordAndMoveOn('the goals or targets, as numbers or dates', { question: 'What did the credit review on Friday decide?' })).toBe('Then the goals or targets, as numbers or dates goes on this record as not given. What did the credit review on Friday decide?');
    expect(recordAndMoveOn(null, { owed: 'what they need from other people' })).toBe('That goes on this record as you put it. The other thing this check-in is for: what you need from other people.');
    expect(recordAndMoveOn(null, {})).toBe('That goes on this record as you put it.');
    expect(NOTHING_HERE_HAS_A_NUMBER).toMatch(/how it will read/);
  });
});
