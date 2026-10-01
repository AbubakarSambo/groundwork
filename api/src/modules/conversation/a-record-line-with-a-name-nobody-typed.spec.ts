import { aNameNobodyTyped } from './a-record-line-with-a-name-nobody-typed';
import { saidWordForWord } from '../reports/a-quote-is-what-they-said';

/** Amina Bello's own answers and the line stored from them (api/journey/all-24/re-a/seniorhire.json, session 1). */
const SHE_TYPED = [
  'I told them repayment starts. Early success is him taking the lead with our five largest clients. I need him to own those relationships.',
  "I'd see him setting up meetings directly with the clients. I'd stop being invited to every single call.",
  'I thought it was understood that I wouldn\'t be in every client meeting by now. That was the whole point of hiring him.',
  'He did. He set them up.',
  "I'm not sure what you mean by \"which of these\". I'm in all the meetings.",
].join('\n');
const THE_LINE = 'Amina set up the client meetings I am still attending.';

describe('a record line with a name nobody typed', () => {
  it('finds the lead\'s own first name on the hire\'s work, which she never typed', () => {
    expect(aNameNobodyTyped(THE_LINE, SHE_TYPED, ['Dr Amina Bello', 'Tobi Adewale'])).toEqual(['Amina']);
  });

  it('was never her own words, so it was not the stamp that failed', () => {
    expect(saidWordForWord(THE_LINE, SHE_TYPED.split('\n'))).toBe(false);
    expect(saidWordForWord('He set them up.', SHE_TYPED.split('\n'))).toBe(true);
  });

  it('lets a line through whose names she did type', () => {
    expect(aNameNobodyTyped('Tobi set up the client meetings I am still attending.', `${SHE_TYPED}\nTobi did.`, ['Dr Amina Bello', 'Tobi Adewale'])).toEqual([]);
  });

  it('does not read the reader\'s own bracketed note as a name', () => {
    expect(aNameNobodyTyped('He set them up. [INFERRED: Amina]', SHE_TYPED, ['Dr Amina Bello'])).toEqual([]);
  });

  it('leaves her other lines alone', () => {
    expect(aNameNobodyTyped("I'm just a little uneasy about the pace.", SHE_TYPED, ['Dr Amina Bello', 'Tobi Adewale'])).toEqual([]);
  });
});
