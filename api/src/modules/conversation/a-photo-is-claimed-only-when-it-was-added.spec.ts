import { theEndCard, whatTheyWereAskedToShow, HOW } from './the-end-card';
import { whatChangedOnTheirDeals, NOT_PROVEN_YET } from './what-changed-on-their-deals';
import { howTheirLineIsKnown } from '../reports/reports.service';

/**
 * A PHOTO IS CLAIMED ONLY WHEN IT WAS ADDED (docs/light-rebuild/sales-first.md, section 5; the light prototype's
 * s68 and s71). Miriam is asked "Can you add the quote? A photo of it is enough." and taps "Later". What she reads,
 * on the card before she finishes, on the done page's "What changed on your deals", and on her own report, must
 * never say a photo was added. The card says what would prove it, in the prototype's words.
 */
const ASKED = [
  'Now, yesterday you said Green Mart wanted a quote. What happened?',
  'So they will buy after this quarter ends. Did they give you a date?',
  'Can you add the quote? A photo of it is enough. Then the Green Mart sale counts as proven, not only as your word.',
  'Did anything else change with your sales today?',
];

describe('what she was asked to show', () => {
  it('is read from this check-in’s own question', () => expect(whatTheyWereAskedToShow(ASKED)).toBe('quote'));
  it('reads "a photo of the receipt" as well as "add the quote"', () => expect(whatTheyWereAskedToShow(['Could you send a photo of the receipt?'])).toBe('receipt'));
  it('is nothing when nothing was asked for', () => expect(whatTheyWereAskedToShow(['What moved today?'])).toBeNull());
  it('is never the proof itself ("add the photo")', () => expect(whatTheyWereAskedToShow(['Can you add the photo?'])).toBeNull());
});

describe('the card before she finishes, when she said "Later"', () => {
  const lines = [
    { type: 'PROGRESS', text: 'Green Mart has a quote.', recallBased: true },
    { type: 'PROGRESS', text: 'Green Mart will buy in January.', recallBased: true },
    { type: 'COMMITMENT', text: 'I’ll visit Westgate Deli on Friday.', recallBased: true },
  ];
  it('the line about the quote says what would prove it, and no line claims a photo', () => {
    const card = theEndCard(lines, false, 'quote')!;
    const quote = card.inYourRecord!.find((l) => l.says === 'Green Mart has a quote.')!;
    expect(quote).toEqual({ says: 'Green Mart has a quote.', how: 'You said this. A photo of the quote would prove it.', mark: 'said' });
    expect(card.inYourRecord!.find((l) => l.says === 'Green Mart will buy in January.')!.how).toBe(HOW.said);
    expect(card.inYourRecord!.find((l) => /Westgate/.test(l.says))!.how).toBe(HOW.commitment);
    expect(JSON.stringify(card)).not.toMatch(/photo you added/);
  });
  it('without the ask, the card says what it always said', () => {
    const card = theEndCard(lines, false, null)!;
    expect(card.inYourRecord!.find((l) => l.says === 'Green Mart has a quote.')!.how).toBe(HOW.said);
  });
  it('a line a photo does back stays proven, from the photo', () => {
    const card = theEndCard([{ type: 'PROGRESS', text: 'Green Mart has a quote.', recallBased: false, anchoredDocumentId: 'd1', anchoredOrigin: 'photo' }], false, 'quote')!;
    expect(card.inYourRecord![0]).toEqual({ says: 'Green Mart has a quote.', how: HOW.photo, mark: 'proven' });
  });
});

describe('what changed on her deals, on the done page', () => {
  const deals = [
    { name: 'Green Mart', kind: 'deal', stage: 'Quoted' },
    { name: 'Westgate Deli', kind: 'deal', stage: 'Quoted' },
    { name: 'Lakeside Supermarket', kind: 'deal', stage: 'Need established' },
  ];
  const today = [
    { type: 'PROGRESS', text: 'Green Mart has a quote.', recallBased: true },
    { type: 'COMMITMENT', text: 'I’ll visit Westgate Deli on Friday.', recallBased: true },
  ];
  it('names only her deals that today’s lines name, and claims no photo she did not add', () => {
    const changed = whatChangedOnTheirDeals('sales org', null, deals, today)!;
    expect(changed.title).toBe('What changed on your deals');
    expect(changed.items.map((i) => i.name)).toEqual(['Green Mart']);
    expect(changed.items[0].says).toBe(NOT_PROVEN_YET);
    expect(changed.items[0].says).toBe('You said this. A photo would prove it.');
    expect(changed.items[0].stages.map((s) => `${s.name}:${s.mark}`)).toEqual([
      'Contacted:said', 'Need established:said', 'Pitched:said', 'Qualified:said', 'Quoted:said', 'Won:none',
    ]);
  });
  it('a plan is not a change to a deal', () => {
    expect(whatChangedOnTheirDeals('sales org', null, deals, [today[1]])).toBeNull();
  });
  it('says the photo only when her own photo backs a line about the deal', () => {
    const proven = [{ type: 'PROGRESS', text: 'Green Mart has a quote.', recallBased: false, anchoredDocumentId: 'd1', anchoredOrigin: 'photo' }];
    expect(whatChangedOnTheirDeals('sales org', null, deals, proven)!.items[0]).toMatchObject({ says: 'From the photo you added.' });
    const notHers = [{ ...proven[0], documentIsTheirOwn: false }];
    expect(whatChangedOnTheirDeals('sales org', null, deals, notHers)!.items[0].says).toBe(NOT_PROVEN_YET);
  });
  it('an earlier photo of hers about the deal still counts, and is said as the photo she added', () => {
    const earlier = [{ type: 'PROGRESS', text: 'Green Mart wants three freezers.', recallBased: false, anchoredDocumentId: 'd0', anchoredOrigin: 'photo' }];
    expect(whatChangedOnTheirDeals('sales org', null, deals, today, [...today, ...earlier])!.items[0].says).toBe('From the photo you added.');
  });
  it('nothing for a check-in with no kind of work', () => expect(whatChangedOnTheirDeals(null, null, deals, today)).toBeNull());
});

describe('her own report says where each line comes from the way the card did', () => {
  it('a photo only where the line is proven by one', () => {
    expect(howTheirLineIsKnown('PROGRESS', 'proven', 'photo')).toBe('From the photo you added.');
    expect(howTheirLineIsKnown('PROGRESS', 'said', null)).toBe('You said this.');
    expect(howTheirLineIsKnown('COMMITMENT', 'said', null)).toBe('You said you will do this. I will ask you how it went.');
    expect(howTheirLineIsKnown('PROGRESS', 'memory', null)).toBe(HOW.memory);
  });
});
