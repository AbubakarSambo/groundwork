import { notAnsweringSince, theSilenceIsTheCustomers, theContactOf, theNamesOnOurSide } from './a-deal-that-has-stalled';
import { eachDealInItsGroup } from './each-deal-in-its-group';
import { theDealsAtTheStallRule } from './what-needs-you-and-what-to-do';
import { theSalesWeek } from '../reports/the-sales-week-in-numbers';

/**
 * DROP ACCESS, 17 OCTOBER 2026. Joseph said on 15 October "Grace hasn't answered me about the KES 4,500 price for Juja
 * Hardware yet." Grace Achieng is his lead. The board read it as Juja Hardware going quiet, and from 20 October would have
 * told Grace "Juja Hardware has not answered Joseph since 15 October". Only the customer's side starts a stall.
 * These are Joseph's lines as they are on record in the test company.
 */
const JOSEPHS_LINES = [
  { text: 'I need an answer about the KES 12,000 discount for Mama Pima.', createdAt: '2026-10-12T15:06:44Z' },
  { text: "Mama Pima hasn't replied since Monday.", createdAt: '2026-10-13T15:06:37Z' },
  { text: "Mama Pima still hasn't replied to me about the discount.", createdAt: '2026-10-15T15:07:35Z' },
  { text: "The discount for Mama Pima was with Wanjiru, and she hasn't replied to me yet.", createdAt: '2026-10-15T15:07:35Z' },
  { text: "Grace hasn't answered me about the KES 4,500 price for Juja Hardware yet.", createdAt: '2026-10-15T15:07:35Z' },
];
/* The people in the check-in and on the roster, as the record holds them. */
const OUR_SIDE = ['Grace', 'Achieng', 'Kevin', 'Omondi', 'Mercy', 'Wairimu', 'Joseph', 'Kariuki', 'Grace Achieng', 'Kevin Omondi', 'Mercy Wairimu', 'Joseph Kariuki'];
const NOW = new Date('2026-10-21T12:00:00Z');

function theBoardFor(lines: typeof JOSEPHS_LINES) {
  const deal = (id: string, name: string) => ({
    id, kind: 'deal', name, stage: 'Quoted', mark: 'said', from: 'said', lastSaidOn: '2026-10-15',
    owner: 'Joseph Kariuki', ownerParticipantId: 'p-joseph',
    notAnsweringSince: notAnsweringSince(name, lines, { people: OUR_SIDE })?.toISOString().slice(0, 10) ?? null,
    contactHistory: [{ on: '2026-10-15' }],
  });
  const sections: any = [{ rows: [deal('d1', 'Mama Pima Stores'), deal('d2', 'Juja Hardware')], stages: ['Contacted', 'Quoted', 'Won'] }];
  const [sec] = eachDealInItsGroup('sales org', sections, null, NOW) as any[];
  return { rows: sec.rows as any[], stall: theDealsAtTheStallRule(sec.rows) };
}

describe('a colleague not answering is not the customer going quiet', () => {
  it('Juja Hardware has no stall start; Mama Pima Stores is quiet since Monday 12 October', () => {
    expect(notAnsweringSince('Juja Hardware', JOSEPHS_LINES, { people: OUR_SIDE })).toBeNull();
    expect(notAnsweringSince('Mama Pima Stores', JOSEPHS_LINES, { people: OUR_SIDE })?.toISOString().slice(0, 10)).toBe('2026-10-12');
  });

  it('what Grace reads on her board: Mama Pima Stores has not answered Joseph, and nothing about Juja Hardware', () => {
    const { rows, stall } = theBoardFor(JOSEPHS_LINES);
    expect(rows.find((r) => r.name === 'Juja Hardware').group).not.toBe('cold');
    expect(rows.find((r) => r.name === 'Mama Pima Stores').group).toBe('cold');
    expect(stall.map((s) => s.title)).toEqual(['Mama Pima Stores has not answered Joseph since 12 October']);
    expect(JSON.stringify(stall)).not.toContain('Juja Hardware');
  });

  it('without the names on record it would have read Juja Hardware as quiet, which is the defect', () => {
    expect(notAnsweringSince('Juja Hardware', JOSEPHS_LINES)?.toISOString().slice(0, 10)).toBe('2026-10-15');
  });

  it('the weekly report counts only Mama Pima Stores as stalled', () => {
    const deal = (id: string, name: string) => ({ id, name, stage: 'Quoted', ownerParticipantId: 'p-joseph', fields: {}, firstOnRecordAt: new Date('2026-10-12T00:00:00Z'), proven: false });
    const week = theSalesWeek([deal('d1', 'Mama Pima Stores'), deal('d2', 'Juja Hardware')] as any, ['Contacted', 'Quoted', 'Won'], JOSEPHS_LINES, new Date('2026-10-19T00:00:00Z'), NOW, OUR_SIDE);
    expect(week.stalled).toBe(1);
  });

  it('whose silence a line says', () => {
    const side = { people: OUR_SIDE };
    expect(theSilenceIsTheCustomers('No reply from Grace on the Juja Hardware price.', 'Juja Hardware', side)).toBe(false);
    expect(theSilenceIsTheCustomers('No reply from Juja Hardware since Monday.', 'Juja Hardware', side)).toBe(true);
    expect(theSilenceIsTheCustomers('I called Juja Hardware twice but they have not answered.', 'Juja Hardware', side)).toBe(true);
    expect(theSilenceIsTheCustomers('I have not answered Juja Hardware about delivery.', 'Juja Hardware', side)).toBe(false);
    expect(theSilenceIsTheCustomers('Juja Hardware has gone quiet.', 'Juja Hardware', side)).toBe(true);
    /* The deal's Contact is the customer's side, even when the name is also somebody on the roster. */
    expect(theSilenceIsTheCustomers('Kevin at Juja Hardware has not replied.', 'Juja Hardware', { people: OUR_SIDE, contact: 'Kevin' })).toBe(true);
  });

  it('the Contact is read from the deal record, and the names from the check-in and the roster', async () => {
    expect(theContactOf({ Value: 'KES 4,500', Contact: 'Peter Mwangi' })).toBe('Peter Mwangi');
    expect(theContactOf({ Value: 'KES 4,500' })).toBeNull();
    const prisma = { person: { findMany: jest.fn(async () => [{ displayName: 'Wanjiru Njeri', givenName: 'Wanjiru', familyName: 'Njeri' }]) } };
    const names = await theNamesOnOurSide(prisma, 'org-1', [{ user: { firstName: 'Joseph', lastName: 'Kariuki' } }, { nameGiven: 'Grace' }]);
    expect(names).toEqual(['Joseph', 'Kariuki', 'Grace', 'Wanjiru Njeri', 'Wanjiru', 'Njeri']);
    expect(prisma.person.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: 'org-1' } }));
  });
});
