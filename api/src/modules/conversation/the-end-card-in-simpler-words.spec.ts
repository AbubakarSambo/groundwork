import { theEndCard, HOW, HOW_IN_SIMPLER_WORDS, WHAT_WOULD_MAKE_IT_PROVEN, WHAT_WOULD_MAKE_IT_PROVEN_IN_SIMPLER_WORDS } from './the-end-card';

/**
 * THE END CARD, AS THE PERSON READS IT, WITH AND WITHOUT "USE SIMPLER WORDS". Their own lines are
 * their own words in both. Only what the product says about each line changes.
 */
const LINES = [
  { type: 'COMMITMENT', text: 'I will call the Quickmart buyer on Monday' },
  { type: 'PROGRESS', text: 'We have sold 40 crates this week', recallBased: true },
  { type: 'UPDATE', text: 'We sent 12 crates on Friday', recallBased: false, anchoredDocumentId: 'd1', anchoredOrigin: 'photo', backedByAPhoto: true },
];

describe('the end card', () => {
  it('is exactly what it was with the switch off', () => {
    const card = theEndCard(LINES)!;
    expect(card.inYourRecord!.map((l) => l.how)).toEqual([HOW.commitment, HOW.memory, HOW.photo]);
    expect(card.next).toEqual([WHAT_WOULD_MAKE_IT_PROVEN]);
    expect(theEndCard(LINES, false)).toEqual(card);
  });
  it('says what each line rests on in the plainer form with the switch on, and keeps their words', () => {
    const card = theEndCard(LINES, true)!;
    expect(card.inYourRecord!.map((l) => l.says)).toEqual(theEndCard(LINES)!.inYourRecord!.map((l) => l.says));
    expect(card.inYourRecord!.map((l) => l.how)).toEqual([HOW_IN_SIMPLER_WORDS.commitment, HOW_IN_SIMPLER_WORDS.memory, HOW_IN_SIMPLER_WORDS.photo]);
    expect(card.inYourRecord![1].how).toBe('You said this from memory. You have nothing written for it yet.');
    expect(card.next).toEqual([WHAT_WOULD_MAKE_IT_PROVEN_IN_SIMPLER_WORDS]);
  });
  it('says how many lines it left out in short sentences', () => {
    const many = Array.from({ length: 8 }, (_, i) => ({ type: 'UPDATE', text: `Thing number ${i}` }));
    expect(theEndCard(many, true)!.next![0]).toBe('2 more lines are in your record. You can read them after you finish.');
    expect(theEndCard(many)!.next![0]).toBe('There are 2 more lines in your record. You can read them all in your record after you finish.');
  });
});
