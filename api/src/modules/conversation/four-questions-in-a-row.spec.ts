import { tooManyQuestionsInARow, landThisOneInstead } from './four-questions-in-a-row';

/**
 * The rhythm rule was written into the prompt and the number did not move - 76% of turns ended on a
 * question before it, 80% after. This is the same rule said at the moment it applies, as a fact
 * about what the model has just done rather than a preference it read half an hour ago.
 */
describe('four questions in a row', () => {
  const q = (n: number) => Array.from({ length: n }, (_, i) => `Turn ${i}, and what happened next?`);

  it('fires after three questions in a row', () => {
    expect(tooManyQuestionsInARow(q(3))).toBe(true);
    expect(tooManyQuestionsInARow(q(5))).toBe(true);
  });

  it('does not fire on two, because two in a row is a conversation', () => {
    expect(tooManyQuestionsInARow(q(2))).toBe(false);
  });

  it('is broken by one turn that landed instead of asking', () => {
    expect(tooManyQuestionsInARow([...q(2), 'Nine days for a quote, and it went cold in the gap.'])).toBe(false);
  });

  it('reads a question mark that closes inside quotes or a bracket', () => {
    expect(tooManyQuestionsInARow([...q(2), 'So what would "done" look like?"'])).toBe(true);
  });

  it('says what to do instead of only what not to do', () => {
    /* "Do not ask a question" on its own is an instruction to stop talking. */
    const line = landThisOneInstead();
    expect(line).toMatch(/say the single thing you noticed/i);
    expect(line).toMatch(/stop there/i);
  });

  it('survives an empty or short history', () => {
    expect(tooManyQuestionsInARow([])).toBe(false);
    expect(tooManyQuestionsInARow(['', '  '])).toBe(false);
  });
});
