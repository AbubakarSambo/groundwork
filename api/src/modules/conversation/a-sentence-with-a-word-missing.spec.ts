import { theirSpellingOfAnAcronym } from './the-record-holds-what-was-said';
import { readsAsBroken } from './a-sentence-with-a-word-missing';

describe('their own spelling of their own acronym', () => {
  it('puts back the spelling the person used', () => {
    /* Read live 10 Sep 2026: she typed NABG, the reply asked her about "NAB-G". */
    expect(theirSpellingOfAnAcronym('What does the NAB-G outreach look like?', ['the NABG member list'])).toBe(
      'What does the NABG outreach look like?',
    );
  });

  it('leaves an acronym they never used alone', () => {
    expect(theirSpellingOfAnAcronym('The NAB-G list', ['nothing here'])).toBe('The NAB-G list');
  });

  it('never invents a different acronym', () => {
    expect(theirSpellingOfAnAcronym('The USDA rules', ['we work with NABG'])).toBe('The USDA rules');
  });

  it('does nothing when the spellings already agree', () => {
    expect(theirSpellingOfAnAcronym('The NABG list', ['NABG'])).toBe('The NABG list');
  });
});

describe('a sentence with a word missing', () => {
  it('catches the shape that reached a transcript', () => {
    /* Saved to a real transcript: "every we discuss is to help you build a clear, honest record". */
    expect(readsAsBroken('Understood. every we discuss is to help you build a record.')).toBe(true);
  });

  it('catches the other determiner-then-pronoun drops', () => {
    for (const bad of ['the they said it', 'a you mentioned', 'each we agreed', 'this I said']) {
      expect(readsAsBroken(`Right. ${bad} matters.`)).toBe(true);
    }
  });

  it('passes ordinary English, including the near misses', () => {
    for (const good of [
      'Everything we discuss is to help you build a record.',
      'The thing they said matters.',
      'That is a good, specific question.',
      'Which three pages are still to do?',
      'This is what I said last time.',
      'A week is all we have.',
    ]) {
      expect(readsAsBroken(good)).toBe(false);
    }
  });

  it('is safe about nothing', () => {
    expect(readsAsBroken('')).toBe(false);
  });
});
