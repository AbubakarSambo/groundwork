import { wordsWeDoNotUse } from './words-we-do-not-use';

/** Task 2.8, week 4: never comment on someone's answers getting shorter. */
describe('never about how much they say', () => {
  it('asks again when a reply remarks on how much they are saying', () => {
    expect(wordsWeDoNotUse('Your answers have been shorter this week. What moved on the Kano order?').length).toBeGreaterThan(0);
    expect(wordsWeDoNotUse("You've been brief today. Which shop placed the order?").length).toBeGreaterThan(0);
  });

  it('and leaves an ordinary question alone', () => {
    expect(wordsWeDoNotUse('Last time you said Green Mart wanted a quote. What happened?')).toEqual([]);
  });
});
