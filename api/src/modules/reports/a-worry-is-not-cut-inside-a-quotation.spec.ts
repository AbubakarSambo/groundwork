import { atAGlanceTiles, theFirstSentenceThatFits } from './what-this-session-holds';

/**
 * A SENTENCE IS NOT CUT INSIDE A QUOTATION (final check of the anchor, 8 October). The tile quoted Juma, cut his words at the first full stop
 * inside the quotation marks, and ran the count on from the open quote: 'You said, "Two shops owe us. There are 3 more worries on record'.
 */
const tile = (worry: string) => (atAGlanceTiles({ agreed: 0, stillOpen: 1, movedOnTargets: null, blocked: 0, waiting: 0, backedPct: null, numberWasSaid: false, worries: 4, theWorry: worry } as any)
  .map((t: any) => t.sub).find((s: any) => /more worries/.test(String(s))) as string);

describe('a worry is quoted whole, and the count starts a sentence of its own', () => {
  it('a quotation with a full stop inside it is not cut at that full stop', () => {
    expect(tile('You said, "Two shops owe us. I never ask."')).toBe('You said, "Two shops owe us. I never ask." There are 3 more worries on record, and no wait has been recorded against a named person.');
  });
  it('a quotation of one sentence reads as it did', () => {
    expect(tile('You said, "Nobody told me it was my job to ask."')).toBe('You said, "Nobody told me it was my job to ask." There are 3 more worries on record, and no wait has been recorded against a named person.');
  });
  it('a quotation that ends on a question is kept to its mark', () => {
    expect(theFirstSentenceThatFits('Juma Otieno said, "Who asks the shops? Not me." Then more.')).toBe('Juma Otieno said, "Who asks the shops? Not me."');
  });
  it('a sentence with no quotation is cut as before', () => {
    expect(theFirstSentenceThatFits('The fridge is broken. Nothing happened.')).toBe('The fridge is broken.');
  });
  it('a quotation that never closes is left as it was', () => {
    expect(theFirstSentenceThatFits('He said, "Two shops owe us. And more')).toBe('He said, "Two shops owe us.');
  });
});
