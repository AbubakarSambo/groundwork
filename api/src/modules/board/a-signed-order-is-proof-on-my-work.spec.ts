import { theCountFromTheDeals, theSalesAnswer, type ADealOnRecord } from './a-sales-aim-is-counted-from-the-deals';
import { myWorkFrom } from './my-work';

/**
 * HAFSAH'S DECISION, 22 NOVEMBER 2026 ("great do you recommendation"): a signed order counts as proof on My work, by the same rule as
 * the board. My work read "1 sold, 0 with proof" for a sale the board counted on its signed order, because My work counted payments
 * only. Payment is said apart: the signed order is proof of the sale, not of the payment.
 */
const at = (s: string) => new Date(s);
const STAGES = ['Contacted', 'Pitched', 'Quoted', 'Won'];
const deal = (name: string, units: string, o: Partial<ADealOnRecord>): ADealOnRecord => ({ id: name, name, stage: 'Won', ownerParticipantId: 'p-mercy', fields: { Units: units }, firstOnRecordAt: at('2026-10-12T11:00:00Z'), proven: false, paid: false, signed: false, wonNeedsProof: true, ...o });
const AIM = { name: 'Units sold by 30 October', ownerParticipantId: 'p-mercy' };

/* As my-work.ts passes the board's count to the page. */
const myWorkWith = (deals: ADealOnRecord[], reader: 'self' | 'lead') => {
  const c = theCountFromTheDeals(AIM, deals, STAGES, at('2026-10-14T08:00:00Z'), 'Africa/Nairobi')!;
  const page: any = myWorkFrom({
    reader, person: { participantId: 'p-mercy', name: 'Mercy Wanjiku', firstName: 'Mercy' }, leadFirst: 'Grace', kindOfWork: 'sales team',
    items: [], commitments: [], waitsOnThem: [], raised: [], credits: [], checkIns: [], ownLines: [], patterns: [], teamCoaching: [], helpWith: null,
    target: { count: c.count, target: 30, fromTheDeals: { count: c.count, proven: c.proven ?? 0, shown: c.shown ?? 0, deposit: c.deposit ?? 0, thing: c.thing } },
    now: at('2026-10-14T08:00:00Z'), timeZone: 'Africa/Nairobi',
  } as any, 'Sales team, Q4');
  return { c, tile: `${page.numbers[0].value} ${page.numbers[0].label}` };
};

describe('a signed order is proof on My work, as it is on the board', () => {
  it.each(['self', 'lead'] as const)('one sale on a signed order reads as sold with proof and not yet paid, as %s reads it', (reader) => {
    const { c, tile } = myWorkWith([deal('Greenfield Supermarket', '25', { proven: true, signed: true })], reader);
    expect(theSalesAnswer(c, 30, 0)).toMatch(/^Not yet\. 25 of the 30 units are sold\./);
    expect(tile).toBe('25 sold, 25 with proof, 25 not yet paid');
    expect(tile).not.toMatch(/0 with proof/);
  });
  it('a paid sale and a signed order: both have proof, and only the order is not yet paid', () => {
    const { tile } = myWorkWith([deal('Kilele Hotel', '40', { proven: true, paid: true }), deal('Greenfield Supermarket', '25', { proven: true, signed: true })], 'self');
    expect(tile).toBe('65 sold, 65 with proof, 25 not yet paid');
  });
  it('paid sales only read exactly as before', () => {
    const { tile } = myWorkWith([deal('Kilele Hotel', '40', { proven: true, paid: true })], 'self');
    expect(tile).toBe('40 sold, 40 with proof');
  });
});
