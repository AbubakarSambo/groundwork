import {
  theMovesOnTheDays, inShortFromTheMoves, whyTheNumbersDontMatch, oneThingToThinkAbout, theDocumentsDateOverWhatWasSaid,
  aCustomersPromiseOnTheirDeal, aDayWithItsWeekday,
} from './a-sales-report-read-from-the-deals';
import type { ADealOnRecord } from '../board/a-sales-aim-is-counted-from-the-deals';

/**
 * A SALES CHECK-IN'S REPORTS, READ FROM THE DEALS (Hafsah's points 16, 18, 19, 20 and 21, 18 October 2026). Each test reads
 * the sentence a person is given, from deals and lines shaped as Drop Access (test) holds them.
 */
const STAGES = ['Contacted', 'Need established', 'Pitched', 'Qualified', 'Quoted', 'Won'];
const ZONE = 'Africa/Nairobi';
const deal = (over: Partial<ADealOnRecord> & { name: string }): ADealOnRecord => ({
  id: over.name, stage: null, ownerParticipantId: 'p-mercy', fields: {}, firstOnRecordAt: new Date('2026-10-12T12:00:00Z'), proven: false, paid: false, ...over,
} as ADealOnRecord);
const kept = (...xs: [string, string, boolean?][]) => xs.map(([stage, on, asOf]) => ({ stage, on, by: 'check-in' as const, ...(asOf ? { asOf: true } : {}) }));

describe('In short, on the team’s report: what moved that day and how much has proof', () => {
  const DAY = new Set(['2026-10-18']);
  const DEALS = [
    deal({ name: 'Savannah Cafe', stage: 'Won', paid: false, stagesKept: kept(['Quoted', '2026-10-12T15:01:54Z', true], ['Won', '2026-10-17T22:58:51Z']) }),
    deal({ name: 'Tuskys Westgate', stage: 'Quoted', proven: true, stagesKept: kept(['Contacted', '2026-10-15T15:05:36Z', true], ['Quoted', '2026-10-17T22:59:44Z']) }),
    deal({ name: 'Kilele Hotel', stage: 'Won', paid: true, stagesKept: kept(['Won', '2026-10-14T15:02:03Z', true]) }),
    deal({ name: 'Put back', stage: 'Contacted', stagesKept: kept(['Quoted', '2026-10-13T10:00:00Z', true], ['Contacted', '2026-10-17T23:00:00Z']) }),
  ];

  it('counts each deal that moved forward that day, never a first stage or a move back, with proof by the board’s rules', () => {
    const moves = theMovesOnTheDays(DEALS, STAGES, DAY, ZONE);
    expect(moves.map((m) => [m.name, m.from, m.to, m.proven])).toEqual([
      ['Savannah Cafe', 'Quoted', 'Won', false],
      ['Tuskys Westgate', 'Contacted', 'Quoted', true],
    ]);
    expect(inShortFromTheMoves(moves, 'today', '2026-10-18', '2026-10-18')).toEqual(['Two sales moved forward today, and one of them has proof.']);
  });

  it('says it the kit’s way for one, for all and for none', () => {
    const m = (proven: boolean) => ({ dealId: 'x', name: 'x', ownerParticipantId: null, from: 'Pitched', to: 'Quoted', proven });
    expect(inShortFromTheMoves([m(true), m(false), m(false)], 'today', 'd', null)).toEqual(['Three sales moved forward today, and one of them has proof.']);
    expect(inShortFromTheMoves([m(false)], 'on 15 October', 'd', null)).toEqual(['One sale moved forward on 15 October, but it has no proof yet.']);
    expect(inShortFromTheMoves([m(true), m(true)], 'today', 'd', null)).toEqual(['Two sales moved forward today, and both of them have proof.']);
    expect(inShortFromTheMoves([m(false), m(false), m(false), m(false)], 'today', 'd', null)).toEqual(['Four sales moved forward today, but none of them has proof yet.']);
  });

  it('on a day before the record kept any move, says so rather than "nothing moved"', () => {
    expect(inShortFromTheMoves([], 'on 15 October', '2026-10-15', '2026-10-18')).toEqual(['No sale moved forward on 15 October that the record can show. The first move between stages it holds is from 18 October.']);
    expect(inShortFromTheMoves([], 'today', '2026-10-19', '2026-10-18')).toEqual(['No sale moved forward today.']);
  });

  it('names the day as the kit does', () => {
    expect(aDayWithItsWeekday('2026-10-15')).toBe('Thursday 15 October');
  });
});

describe('Why the numbers don’t match: only where the record can work it out (the price range)', () => {
  const ALL = { Need: '20 units', 'Decision maker': 'Peter', 'Buying date': '2026-10-30' };
  const DEALS = [
    { name: 'Lakeside Supermarket', stage: 'Qualified', fields: { ...ALL, 'Budget stated': 'KES 80,000 to 120,000', Value: 'KES 100,000' }, ownerFirstName: 'Mercy' },
    { name: 'Westgate Deli', stage: 'Pitched', fields: { ...ALL, 'Budget stated': 'between 50k and 70k', Value: 'KES 60,000' }, ownerFirstName: 'Kevin' },
    { name: 'Juja Hardware', stage: 'Qualified', fields: { ...ALL, 'Budget stated': 'KES 22,500', Value: 'KES 22,500' }, ownerFirstName: 'Joseph' },
    { name: 'Mama Pima Stores', stage: 'Contacted', fields: { Need: 'a discount' }, ownerFirstName: 'Joseph' },
  ];

  it('Grace reads which deals each way counts, and the total each way', () => {
    const w = whyTheNumbersDontMatch(DEALS as any, null)!;
    expect(w.says).toEqual([
      'Some of Mercy and Kevin’s customers gave a price range, not a fixed amount. For example, Lakeside Supermarket gave KES 80,000 to 120,000. You have not decided yet whether a price range counts as the customer’s budget, so the same deals can be counted two ways.',
      'This affects two sales: Lakeside Supermarket and Westgate Deli. If a price range counts, three deals are qualified, worth KES 182,500: Lakeside Supermarket, Westgate Deli and Juja Hardware. If it does not, one deal is qualified, worth KES 22,500: Juja Hardware.',
      'Nobody is doing anything wrong. The team has not agreed on one rule yet.',
    ]);
  });

  it('is not shown once the lead has answered, or where no customer gave a range', () => {
    expect(whyTheNumbersDontMatch(DEALS as any, 'yes')).toBeNull();
    expect(whyTheNumbersDontMatch(DEALS as any, 'no')).toBeNull();
    expect(whyTheNumbersDontMatch(DEALS.slice(2) as any, null)).toBeNull();
  });
});

describe('One thing to think about: a question about one of your own deals that is stuck', () => {
  const MERCY_15 = new Date('2026-10-15T20:59:59Z');
  const GREENFIELD = deal({ name: 'Greenfield Supermarket', stage: 'Won', proven: true, paid: false, fields: { Units: '25', Value: 'KES 125,000' }, stagesKept: kept(['Won', '2026-10-15T15:05:36Z', true]) });
  const MBOGA = deal({ name: 'Mama Mboga Mart', stage: 'Need established', fields: { Need: 'two units', Contact: 'Rose' }, stagesKept: kept(['Contacted', '2026-10-14T15:04:59Z', true], ['Need established', '2026-10-17T22:45:07Z']) });

  it('a sale down as won with no payment: the kit’s question about getting paid', () => {
    expect(oneThingToThinkAbout([GREENFIELD, MBOGA], STAGES, [], MERCY_15)).toBe('Greenfield Supermarket said yes, but nothing on record says they have paid yet. What would help you get the payment this week?');
  });

  it('where you said it was paid, the question is about what shows it', () => {
    const lines = [{ text: 'Greenfield took delivery of the 25 units today and paid on delivery.', participantId: 'p-mercy', createdAt: '2026-10-17T22:58:49Z' }];
    expect(oneThingToThinkAbout([GREENFIELD], STAGES, lines, new Date('2026-10-18T20:59:59Z'))).toBe('You said Greenfield Supermarket paid, but nothing written shows the payment yet. What would help you get the receipt or the payment message this week?');
  });

  it('a payment record by then means it is not stuck', () => {
    const paid = { ...GREENFIELD, paid: true, paidOn: new Date('2026-10-15T10:00:00Z') };
    expect(oneThingToThinkAbout([paid], STAGES, [], MERCY_15)).toBeNull();
  });

  it('a quote with no yes, then a deal missing what it needs, in plain words, never a repeat of a promise', () => {
    const quoted = deal({ name: 'Savannah Cafe', stage: 'Quoted', stagesKept: kept(['Quoted', '2026-10-12T15:01:54Z', true]) });
    expect(oneThingToThinkAbout([quoted, MBOGA], STAGES, [], MERCY_15)).toBe('Savannah Cafe has had your quote, but they have not said yes yet. What would help you get an answer this week?');
    expect(oneThingToThinkAbout([MBOGA], STAGES, [], MERCY_15, { buyingDateOf: () => '2026-10-30' })).toBe('Mama Mboga Mart wants two units, but you do not know yet how much they can spend or who decides. What would help you find out this week?');
  });

  it('a deal not on record yet by that day is not asked about', () => {
    expect(oneThingToThinkAbout([{ ...GREENFIELD, firstOnRecordAt: new Date('2026-10-16T00:00:00Z') }], STAGES, [], MERCY_15)).toBeNull();
  });
});

describe('Your own lines: a document’s date over what was said, and a customer’s promise as the customer’s', () => {
  const ORDER = { fileName: 'greenfield-signed-order.txt', participantId: 'p-mercy', content: 'GREENFIELD SUPERMARKET - PURCHASE ORDER PO-4471. Item: water dispenser, quantity 25. Payment on delivery. Signed: M. Njeri, Buyer, 13/10/2026.' };

  it('Mercy reads the signed order’s date, and what she said is noted', () => {
    expect(theDocumentsDateOverWhatWasSaid({ text: 'Mrs. Njeri signed the order today, which is the 15th of October.', createdAt: '2026-10-15T15:05:36Z' }, [ORDER], ZONE)).toEqual({
      readAs: 'Mrs. Njeri signed the order on 13 October.',
      how: 'This date comes from the document you added. You said it was signed on 15 October.',
      documentsDay: '2026-10-13',
      saidDay: '2026-10-15',
    });
  });

  it('says nothing where the dates agree, where no document of hers dates it, or where the line gives no day', () => {
    expect(theDocumentsDateOverWhatWasSaid({ text: 'Mrs. Njeri signed the order on 13 October.', createdAt: '2026-10-15T15:05:36Z' }, [ORDER], ZONE)).toBeNull();
    expect(theDocumentsDateOverWhatWasSaid({ text: 'Mrs. Njeri signed the order today.', createdAt: '2026-10-15T15:05:36Z' }, [], ZONE)).toBeNull();
    expect(theDocumentsDateOverWhatWasSaid({ text: 'The deal is signed for 25 units at 125,000 shillings.', createdAt: '2026-10-15T15:05:36Z' }, [ORDER], ZONE)).toBeNull();
  });

  it('Rose’s promise is Rose’s, kept on her deal; Mercy’s own promise stays hers', () => {
    const deals = [{ name: 'Mama Mboga Mart', fields: { Contact: 'Rose', Need: 'two units' }, buyingDate: '2026-10-30' }];
    expect(aCustomersPromiseOnTheirDeal('Rose said she will buy the two units at the end of the month, on October 30th.', deals))
      .toBe('This is Rose’s promise, not yours, so it is kept on the Mama Mboga Mart deal, with 30 October as the day they will buy. A message from Rose would prove it.');
    expect(aCustomersPromiseOnTheirDeal('I will send Peter the quote for 30 units by Friday.', deals)).toBeNull();
  });

  /*
   * Mercy's own report on the test bed read "Delivery is set for Friday, and they'll pay then. This is Delivery’s promise, not
   * yours, so it is not on your list of things to do." "Delivery" is nobody. The Greenfield Supermarket deal holds this very
   * line as its next step, so the record knows it is Greenfield's; with nothing on record, it is "the customer’s".
   */
  it('Mercy’s "they’ll pay then" is Greenfield Supermarket’s promise, never "Delivery’s"', () => {
    const line = 'Delivery is set for Friday, and they\'ll pay then.';
    const greenfield = { name: 'Greenfield Supermarket', fields: { Units: '25', Value: 'KES 125,000', Contact: 'Mrs. Njeri', 'Next step': 'Delivery is set for Friday, and they\'ll pay then.' } };
    const mboga = { name: 'Mama Mboga Mart', fields: { Contact: 'Rose', Need: '2 units' } };
    const people = ['Mercy Wairimu', 'Mercy', 'Grace Achieng', 'Grace', 'Joseph Kariuki', 'Joseph'];
    const said = aCustomersPromiseOnTheirDeal(line, [mboga, greenfield], people);
    expect(said).toBe('This is Greenfield Supermarket’s promise, not yours, so it is kept on the Greenfield Supermarket deal. A message from Greenfield Supermarket would prove it.');
    expect(said).not.toMatch(/Delivery’s/);
    /* Nothing on record says whose it is: the customer's, never the line's first word. */
    expect(aCustomersPromiseOnTheirDeal(line, [mboga], people)).toBe('This is the customer’s promise, not yours, so it is not on your list of things to do.');
    /* A promise that begins with a customer, a customer's person or a colleague on record is theirs, by their whole name. */
    expect(aCustomersPromiseOnTheirDeal('Savannah Cafe will pay the deposit on Friday.', [{ name: 'Savannah Cafe', fields: { Contact: 'Jane' } }], people)).toMatch(/^This is Savannah Cafe’s promise, not yours/);
    expect(aCustomersPromiseOnTheirDeal('Mrs. Njeri will sign the order on Monday.', [greenfield], people)).toMatch(/^This is Mrs\. Njeri’s promise, not yours/);
    expect(aCustomersPromiseOnTheirDeal('Joseph will bring the samples on Thursday.', [], people)).toBe('This is Joseph’s promise, not yours, so it is not on your list of things to do.');
    /* A name nobody has put on record is not used as whose it is. */
    expect(aCustomersPromiseOnTheirDeal('Ali said he will decide next week.', [], people)).toBe('This is the customer’s promise, not yours, so it is not on your list of things to do.');
  });
});
