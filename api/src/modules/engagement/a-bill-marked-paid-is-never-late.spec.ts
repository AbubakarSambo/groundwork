import { whatIsOutstandingFor, theTemplateParagraph, withPlacesWhereTheyTellApart, theseForAPhone } from './the-leads-daily-nudge';

/**
 * A BILL MARKED PAID IS NEVER CALLED LATE (Hafsah, 19 October, point 4: "a bill marked paid is never called late (FN-004)"; messages test
 * after the fixes, finding 8).
 *
 * Muchemi & Co. (test), "Fee notes". At setup on Monday 12 October the record kept Wanjiru's wait for "payment for fee note FN-004" on
 * Kasarani Foods, due on Monday 5 October. That morning Njeri said Kasarani Foods had paid the KES 250,000 for FN-004, and the bill is
 * marked Paid. From Tuesday to Friday Wanjiru's morning summary said "You are waiting on Kasarani Foods for payment for fee note FN-004,
 * which was due on Monday 5 October and is eight days late." (nine, ten, eleven). FN-006, still unpaid, is told as it was.
 */
const G = 'fd4e6c99-28f7-4daf-b779-2f1a8b21d886';
const WANJIRU = { id: 'gp-wanjiru', groundId: G, userId: 'u-wanjiru', email: null, nameGiven: null, managingOnly: false, leftAt: null, partyType: 'INITIATOR', user: { firstName: 'Wanjiru', lastName: 'Muchemi', awaitingOrgApproval: false } };
const wait = (id: string, what: string, onLabel: string, due: string) => ({ id, groundId: G, what, namedTheThing: true, onLabel, status: 'WAITING', createdAt: new Date('2026-10-12T05:32:35Z'), dueOn: new Date(`${due}T00:00:00Z`), blockerKind: null, fromParticipantId: 'gp-wanjiru', onParticipantId: null, triedSaid: null, sourceCheckInId: null, fromParticipant: WANJIRU, onParticipant: null });
const WAITS = [wait('w-fn004', 'payment for fee note FN-004', 'Kasarani Foods', '2026-10-05'), wait('w-fn006', 'payment for fee note FN-006', 'Baraka Hardware', '2026-09-30')];
const BILLS = [
  { groundId: G, kind: 'bill', name: 'FN-004', stage: 'Paid', fields: { Number: 'FN-004', Client: 'Kasarani Foods', Paid: 'KES 250,000' } },
  { groundId: G, kind: 'bill', name: 'FN-006', stage: 'Chased', fields: { Number: 'FN-006', Client: 'Baraka Hardware', Amount: 'KES 120,000' } },
];

async function wanjirusSummary(bills: any[]) {
  const prisma: any = new Proxy({
    groundParticipant: { findMany: jest.fn(async ({ where }: any) => (where?.userId ? [{ id: 'gp-wanjiru', groundId: G }] : [])) },
    groundDependency: { findMany: jest.fn(async () => WAITS) },
    workItem: { findMany: jest.fn(async () => bills) },
    organization: { findUnique: jest.fn(async () => ({ release1SalesBoardOn: true })) },
  }, { get: (t: any, k: string) => t[k] ?? new Proxy({}, { get: (_x: any, m: string) => jest.fn(async () => (m === 'findMany' ? [] : m === 'count' ? 0 : null)) }) });
  const now = new Date('2026-10-13T05:00:00Z');
  const o = await whatIsOutstandingFor(prisma, { userId: 'u-wanjiru', organizationId: 'org', grounds: [{ id: G, label: 'Fee notes', scenario: 'PULSE_CHECK', overWhatsApp: true, timelineDays: 60, cadence: 'WEEKLY' }] }, { boards: {} as any, release: null }, now);
  return theTemplateParagraph('Wanjiru', withPlacesWhereTheyTellApart(theseForAPhone(o)), 'http://localhost:5207/today').params[1] ?? '';
}

describe("Wanjiru's summary on Tuesday 13 October", () => {
  it('never calls FN-004 late: the record marks it Paid', async () => {
    const said = await wanjirusSummary(BILLS);
    expect(said).not.toContain('FN-004');
    expect(said).toContain('You are waiting on Baraka Hardware for payment for fee note FN-006, which was due on Wednesday 30 September and is 13 days late.');
  });
  it('before it was marked paid, it was late, and said so', async () => {
    const said = await wanjirusSummary([{ ...BILLS[0], stage: 'Promised' }, BILLS[1]]);
    expect(said).toContain('You are waiting on Kasarani Foods for payment for fee note FN-004, which was due on Monday 5 October and is eight days late.');
  });
});
