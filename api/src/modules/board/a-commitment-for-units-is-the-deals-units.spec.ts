import { whatTheOwnerSaidOfEachDeal } from './what-the-owner-said-of-each-deal';
import { toCloseTheGap } from './to-close-the-gap';

/**
 * A CUSTOMER'S COMMITMENT FOR A NUMBER OF UNITS IS THE DEAL'S UNITS (messages test, third run, item 1).
 *
 * Drop Access (test). On Monday 12 October Groundwork asked Mercy "What specifically have you done with Greenfield Supermarket since we
 * last spoke?" and she said "I've secured a verbal commitment from Mrs. Njeri for 25 units. That deal is won." Grace's WhatsApp summary
 * on Tuesday 13 October at 11:00 said "Even if all six open deals close, that is 10 units, 70 short. Savannah Cafe, Upper Hill Offices,
 * Tuskys Westgate, Greenfield and Juja Hardware have no number of units yet."
 */
const at = (s: string) => new Date(s);
const MERCYS_MONDAY = [
  { role: 'AI', content: 'Those are the three categories. Which specific customers have you been working with since we last spoke?', createdAt: at('2026-10-12T11:05:07.162Z') },
  { role: 'PERSON', content: "I've been working with Greenfield Supermarket, and I have a new lead at Tuskys Westgate.", createdAt: at('2026-10-12T11:05:07.964Z') },
  { role: 'AI', content: 'What specifically have you done with Greenfield Supermarket since we last spoke?', createdAt: at('2026-10-12T11:05:17.952Z') },
  { role: 'PERSON', content: "I've secured a verbal commitment from Mrs. Njeri for 25 units. That deal is won.", createdAt: at('2026-10-12T11:05:19.131Z') },
  { role: 'AI', content: 'For the record, a photo of the signed order or an email confirmation is enough to show it is won. Do you have either of those for Greenfield Supermarket?', createdAt: at('2026-10-12T11:05:25.975Z') },
  { role: 'PERSON', content: "Not yet, but Mrs. Njeri said yes on the phone. I'm calling her tomorrow to get the order signed. I couldn't even show her samples because Joseph didn't bring them to me when he said he would.", createdAt: at('2026-10-12T11:05:27.030Z') },
];

describe("Mercy's Greenfield deal", () => {
  const greenfield = { id: 'w-greenfield', name: 'Greenfield', stage: 'Contacted', fields: {} };
  const tuskys = { id: 'w-tuskys', name: 'Tuskys Westgate', stage: 'Contacted', fields: {} };
  it('holds the 25 units she said Mrs Njeri committed to, and Tuskys Westgate holds none', () => {
    const said = whatTheOwnerSaidOfEachDeal([greenfield, tuskys], MERCYS_MONDAY, ['Grace', 'Kevin', 'Mercy', 'Joseph', 'Amos']);
    expect(said.get('w-greenfield')?.set.Units).toBe('25');
    expect(said.get('w-tuskys')?.set.Units).toBeUndefined();
  });
  it('a commitment still to come is not the units: "I will get an order for 25 units"', () => {
    const later = [MERCYS_MONDAY[2], { ...MERCYS_MONDAY[3], content: "I will get an order for 25 units from Mrs. Njeri tomorrow." }];
    expect(whatTheOwnerSaidOfEachDeal([greenfield], later, ['Mercy']).get('w-greenfield')?.set.Units).toBeUndefined();
  });

  it("Grace's summary on Tuesday counts them, and names only the deals with no number", () => {
    const said = whatTheOwnerSaidOfEachDeal([greenfield], MERCYS_MONDAY, ['Mercy']);
    const row = (id: string, name: string, owner: string, fields: Record<string, string> = {}) => ({ id, kind: 'deal', name, owner, group: 'possible', fields, next: null });
    const sections: any = [{ rows: [
      row('w-savannah', 'Savannah Cafe', 'Kevin'),
      row('w-upper', 'Upper Hill Offices', 'Kevin'),
      row('w-tuskys', 'Tuskys Westgate', 'Mercy'),
      row('w-greenfield', 'Greenfield', 'Mercy', said.get('w-greenfield')?.set ?? {}),
      row('w-juja', 'Juja Hardware', 'Joseph'),
      row('w-pima', 'Mama Pima Stores', 'Joseph', { Units: '10' }),
    ] }];
    const gap = toCloseTheGap('sales team' as any, sections, [{ name: '120 units sold by 30 October', target: 120, count: 40, fromTheDeals: { counts: 'units' } }], at('2026-10-30T00:00:00Z'), at('2026-10-13T08:00:00Z'), { inShort: true });
    expect(gap?.says).toBe(/* Customer names go in the list (Hafsah, 25 October). */ 'Even if all six here close, that is 35 units, 45 short. Four of them have no number of units yet.');
  });
});
