import { theCountFromTheDeals, theSalesAnswer, type ADealOnRecord } from './a-sales-aim-is-counted-from-the-deals';
import { toCloseTheGap } from './to-close-the-gap';

/**
 * GRACE'S MORNING SUMMARY, TUESDAY 13 OCTOBER (Drop Access, messages test, fourth run): "55 more units are needed to reach the target of
 * 120 units." Greenfield's 25 units were counted as sold on Mercy's word ("I've already won Greenfield Supermarket for 25 units."),
 * before the signed order came on Wednesday, against Grace's own rule "A sale counts only with proof of payment or a signed order."
 */
const at = (s: string) => new Date(s);

describe("Grace's rule: a sale counts only with a payment or a signed order", () => {
  const STAGES = ['Contacted', 'Need established', 'Pitched', 'Qualified', 'Quoted', 'Won'];
  const deal = (name: string, units: string, o: Partial<ADealOnRecord>): ADealOnRecord => ({ id: name, name, stage: 'Won', ownerParticipantId: null, fields: { Units: units }, firstOnRecordAt: at('2026-10-12T11:00:00Z'), proven: false, paid: false, signed: false, wonNeedsProof: true, ...o });
  const AIM = { name: 'Units sold by 30 October', ownerParticipantId: null };
  it('on Tuesday 13 October 40 are sold, not 65: Greenfield is not counted until the signed order', () => {
    const c = theCountFromTheDeals(AIM, [deal('Kilele Hotel', '40', { proven: true, paid: true }), deal('Greenfield Supermarket', '25', {})], STAGES, at('2026-10-13T08:00:00Z'), 'Africa/Nairobi')!;
    expect(c.count).toBe(40);
    expect(theSalesAnswer(c, 120, 0)).toBe("Not yet. 40 of the 120 units are sold. 40 are paid (Kilele Hotel). Greenfield Supermarket's 25 units are not counted yet, because a sale counts only with a payment or a signed order.");
    const gap = toCloseTheGap('sales team' as any, [{ rows: [
      { id: 'pima', kind: 'deal', name: 'Mama Pima Stores', owner: 'Joseph', group: 'possible', fields: { Units: '10' }, next: null },
    ] }] as any, [{ name: AIM.name, target: 120, count: c.count, fromTheDeals: { counts: 'units' } }], at('2026-10-30T00:00:00Z'), at('2026-10-13T08:00:00Z'), { inShort: true });
    expect(gap?.gap).toBe(80);
    expect(gap?.says).toBe('Even if this one closes, that is 10 units, 70 short.');
  });
  it('on Wednesday, with the signed order on record, both count', () => {
    const c = theCountFromTheDeals(AIM, [deal('Kilele Hotel', '40', { proven: true, paid: true }), deal('Greenfield Supermarket', '25', { proven: true, signed: true })], STAGES, at('2026-10-14T08:00:00Z'), 'Africa/Nairobi')!;
    expect(c.count).toBe(65);
    expect(c.notCountedDeals).toBeUndefined();
  });
  it('where the lead set no such rule, a sale said won still counts on the word, as before', () => {
    const c = theCountFromTheDeals(AIM, [deal('Kilele Hotel', '40', { proven: true, paid: true, wonNeedsProof: false }), deal('Greenfield Supermarket', '25', { wonNeedsProof: false })], STAGES, at('2026-10-13T08:00:00Z'), 'Africa/Nairobi')!;
    expect(c.count).toBe(65);
  });
});
