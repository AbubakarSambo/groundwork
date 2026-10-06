import { safeToUse } from './the-model-words-it-and-nothing-more';

/*
 * Release round, 5 October 2026 (privacy sweep, check-in a1e9545b, session 4): the draft held one real "you said", so the
 * guard let a second, invented one through, and the lead and the person evaluated read the product's own observation as
 * the person's words.
 */
describe('a second "you said" is not let through by the first', () => {
  const draft = 'In session 2, you said you would send the figures by Friday.\nThis is session 4 of 6 of this work. Nothing has come up often enough yet to be called a pattern.';

  it('refuses a wording that puts one more thing in the reader\'s mouth than the draft did', () => {
    const worded = 'In session 2, you said you would send the figures by Friday.\nYou are in session 4 of 6 for this work, and you say that nothing has come up often enough yet to be called a pattern.';
    expect(safeToUse(draft, worded)).toBe(false);
  });

  it('keeps a wording that only carries the draft\'s own "you said"', () => {
    const worded = 'In session 2, you said you would send the figures by Friday.\nThis is session 4 of 6. Nothing has come up often enough yet to be called a pattern.';
    expect(safeToUse(draft, worded)).toBe(true);
  });
});
