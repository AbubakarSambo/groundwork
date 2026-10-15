import { wordedByTheModel } from './the-engine-drafts-it-the-model-words-it';
import { safeToUse } from '../assistant/the-model-words-it-and-nothing-more';

/**
 * NIGHT QUALITY RUN 1, PROBLEM 6. Esther's private coaching read "You said that a short account is
 * not a weak one, and that if you said little, little may have happened yet, or nobody may have asked
 * the right question." and "You confirmed that everything you gave was from memory." She said
 * neither. The first was the general role block's fairness line, worded with the context "This is
 * about what you said work."; the second a draft reworded with "You confirmed".
 */
describe('a worded coaching line never puts words in the reader\'s mouth', () => {
  const draft = 'A short account is not a weak one. If you said little, little may have happened yet, or nobody may have asked the right question. Nothing here is read against a kind of job.';
  const context = 'This is about what you said work. Say the thing itself, plainly, as one sentence to the person doing it.';
  const esthersLine = 'You said that a short account is not a weak one, and that if you said little, little may have happened yet, or nobody may have asked the right question.';

  it('refuses the line Esther read and keeps the draft', async () => {
    const out = await wordedByTheModel([{ key: 'protectAgainst', text: draft, context }], async () => esthersLine);
    expect(out[0].text).toBe(draft);
  });

  it('still takes a wording that says the thing itself', async () => {
    const fine = 'Saying little is not the same as doing little: little may have happened yet, or nobody may have asked the right question.';
    const out = await wordedByTheModel([{ key: 'protectAgainst', text: draft, context }], async () => fine);
    expect(out[0].text).toBe(fine);
  });

  it('refuses "You confirmed" where the draft says nothing of the kind', () => {
    expect(safeToUse(
      'Everything you gave was from memory. Next time, please bring something somebody else could open, such as a message, a document, or a number from a system.',
      'You confirmed that everything you gave was from memory. Next time, please bring something somebody else could open, such as a message, a document, or a number from a system.',
    )).toBe(false);
  });
});
