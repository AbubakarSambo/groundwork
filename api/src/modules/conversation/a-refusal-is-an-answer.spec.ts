import { recordAndMoveOn, whatTheAbsenceMeans, NOTHING_HERE_HAS_A_NUMBER } from './a-refusal-is-an-answer';

/** Ngozi, run 6: asked for the individual targets three times, then what she would do about it, twice. */
describe('a refusal is an answer', () => {
  it('says what the absence means, to the person', () => {
    expect(whatTheAbsenceMeans('who is responsible for which part of that plan')).toBe('Then this record shows nothing on who is responsible for which part of that plan.');
    expect(whatTheAbsenceMeans('what is clear and what is not')).toBe('Then this record shows nothing on what is clear and what is not.');
    expect(whatTheAbsenceMeans('what this is trying to achieve')).toBe('Then this record shows nothing on what this is trying to achieve.');
    expect(whatTheAbsenceMeans('the part of the plan that is theirs to do')).toBe('Then this record shows nothing on the part of the plan that is yours to do.');
  });
  it('and moves to the next thing: the plan\'s question, else the next owed thing, else nothing', () => {
    expect(recordAndMoveOn('the goals or targets, as numbers or dates', { question: 'What did the credit review on Friday decide?' })).toBe('Then this record shows nothing on the goals or targets, as numbers or dates. What did the credit review on Friday decide?');
    /* Asked, not labelled: "The other thing this check-in is for: what you need from other people" read as a weird colon (Hafsah, 21 Sep 2026). */
    /* The acknowledgement is no longer about a record - see the-same-sentence-five-times. What this
       test is for is unchanged: a refusal is taken and the conversation moves to the next thing. */
    expect(recordAndMoveOn(null, { owed: 'what they need from other people' })).toBe('Understood. What do you need from other people?');
    /* CHANGED 26 September 2026. This pinned the single word "Understood." as a whole turn, which
       is what it was: three of them shipped on the run of that day, and "curt turns" was the only
       count in the run that came out worse than the baseline. The rule is plain, full sentences,
       and one word acknowledging a refusal tells the person nothing about what their refusal did.
       The behaviour being checked - a refusal is acknowledged and not chased - is unchanged. */
    expect(recordAndMoveOn(null, {})).toBe('Understood. This record shows nothing more on that.');
    expect(recordAndMoveOn(null, {}).split(/\s+/).length).toBeGreaterThan(4);
    expect(NOTHING_HERE_HAS_A_NUMBER).toMatch(/how it will read/);
  });
});
