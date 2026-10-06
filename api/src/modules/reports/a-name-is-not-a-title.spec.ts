import { aNameIsNotATitle } from './party-labels';

/**
 * "The Daniel Osei. has completed a churn model."
 *
 * Read in a lead's own report on the run of 25 September 2026, and 55 more like it across 19
 * scenarios. Neither the article nor the full stop came from the name: the model wrote "The
 * <label>." - the article because a label reads like a role, the stop because the label it was
 * given ended in one - and substitution put a person inside both.
 */
const NAMES = ['Daniel Osei', 'Priti Sharma'];

describe('a name is not a title', () => {
  it('drops the article and the stop the model put round a label', () => {
    expect(aNameIsNotATitle('The Daniel Osei. has completed a churn model.', NAMES))
      .toBe('Daniel Osei has completed a churn model.');
    expect(aNameIsNotATitle('The Priti Sharma. is managing access requests.', NAMES))
      .toBe('Priti Sharma is managing access requests.');
  });

  it('mid-sentence too, where the article is lower case', () => {
    expect(aNameIsNotATitle('They have not updated the Daniel Osei. on the status.', NAMES))
      .toBe('They have not updated Daniel Osei on the status.');
  });

  it('and the stop on its own, with no article', () => {
    expect(aNameIsNotATitle('Daniel Osei. has completed it.', NAMES))
      .toBe('Daniel Osei has completed it.');
  });

  it('but a stop that really does end the sentence stays', () => {
    /* The test that stops this becoming a sentence-joiner: a capital follows, so the stop is real. */
    expect(aNameIsNotATitle('That was agreed by Daniel Osei. Priti Sharma then replied.', NAMES))
      .toBe('That was agreed by Daniel Osei. Priti Sharma then replied.');
  });

  it('and a sentence that starts with the article keeps its capital', () => {
    expect(aNameIsNotATitle('The Daniel Osei is blocked.', NAMES)).toBe('Daniel Osei is blocked.');
  });

  it('leaves text with no names in it exactly as it was', () => {
    const t = 'The team has 11 of the 40 approved facilities.';
    expect(aNameIsNotATitle(t, NAMES)).toBe(t);
    expect(aNameIsNotATitle(t, [])).toBe(t);
  });
});
