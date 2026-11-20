import { whatIsOutstandingFor, theTemplateParagraph, withPlacesWhereTheyTellApart, theseForAPhone } from './the-leads-daily-nudge';
import { sendTheLeadsWeeklyLetters } from '../email/the-leads-weekly-letter';
import { DUE_ON_AN_EVENT } from '../board/a-fee-note-due-on-an-event';

/**
 * NOTHING TOLD THE PARTNER A FEE NOTE FELL DUE (messages test, 19 October, finding 4, the messages' part).
 *
 * Muchemi & Co. (test). Brian said on Tuesday 13 October, in "Litigation team daily", that the reply in Kasarani Foods v. Tumaini Traders
 * was filed, so FN-005 fell due; David said on Wednesday 14 October that the hearing date is 12 November, so the third Kasarani Foods fee
 * note could be raised. Wanjiru's four morning summaries and her Friday letter said neither: the letter read "Here is what moved this
 * week. Nothing has been shown to back it yet. Aisha Kamau is no longer waiting on the client's HR manager ...". Both now say it, from
 * the line the record kept on each fee note, where Release 2 is on.
 */
const ORG = '494f8e2d-f920-4132-8252-e17fb7bf7172';
const FEES = '5cc90a8f-3eaa-4e83-bc03-faa681c8b60e';
const LIT = '352b8180-f633-40ac-ab0d-824432e9f394';
const P = {
  wanjiruFees: '173483b8-5be4-4564-9742-21ddc14c7fef', brianFees: '52af0577-9d36-445b-aa10-ed237301e098',
  wanjiruLit: '3e60b08a-d31d-4b7e-9adc-b4c60bd4b0f1', brianLit: 'e9e2d42c-c918-491e-8b13-73b212ec6f2c', davidLit: 'de8b5211-561a-4633-9e7d-a0f27a7bbe8a',
};
const PEOPLE: Record<string, any> = {
  [P.wanjiruFees]: { userId: 'u-wanjiru', user: { firstName: 'Wanjiru', lastName: 'Muchemi' } },
  [P.wanjiruLit]: { userId: 'u-wanjiru', user: { firstName: 'Wanjiru', lastName: 'Muchemi' } },
  [P.brianFees]: { userId: 'u-brian', user: { firstName: 'Brian', lastName: 'Otieno' } },
  [P.brianLit]: { userId: 'u-brian', user: { firstName: 'Brian', lastName: 'Otieno' } },
  [P.davidLit]: { userId: 'u-david', user: { firstName: 'David', lastName: 'Mwangi' } },
};
const FN005 = {
  id: 'b6e17e21-2dbf-42b6-882c-5c98e89ee3df', groundId: FEES, name: 'FN-005', stage: 'Due',
  fields: {
    Client: 'Kasarani Foods', Matter: 'Kasarani Foods v. Tumaini Traders', Number: 'FN-005', 'Due when': 'the reply is filed', 'Falls due': '2026-10-13',
    'Follows up': 'Brian Otieno', _followsUp: P.brianFees,
    [DUE_ON_AN_EVENT]: { lineId: 'l-brian', groundId: LIT, label: 'Litigation team daily', saidBy: P.brianLit, text: 'The reply in Kasarani Foods v. Tumaini Traders was filed today.', at: '2026-10-13T06:33:00.000Z', day: '2026-10-13' },
  },
};
const THIRD = {
  id: 'fe8b4231-3b93-4dea-ba21-b68eee73724a', groundId: FEES, name: 'the third Kasarani Foods fee note', stage: 'Not yet raised',
  fields: {
    Client: 'Kasarani Foods', 'Due when': 'when I get the hearing date', 'Falls due': '2026-10-14', 'Follows up': 'Brian Otieno', _followsUp: P.brianFees,
    [DUE_ON_AN_EVENT]: { lineId: 'l-david', groundId: LIT, label: 'Litigation team daily', saidBy: P.davidLit, text: 'I learned the hearing date for Kasarani Foods v. Tumaini Traders is November 12.', at: '2026-10-14T08:10:00.000Z', day: '2026-10-14' },
  },
};

const member = (id: string, userId: string, first: string, last: string) => ({ id, userId, email: `${first.toLowerCase()}@muchemi.test`, managingOnly: false, nameGiven: null, lastNudgedAt: null, partyType: userId === 'u-wanjiru' ? 'INITIATOR' : 'PARTICIPANT', user: { firstName: first, lastName: last, awaitingOrgApproval: false } });
const ROSTER = [member(P.wanjiruFees, 'u-wanjiru', 'Wanjiru', 'Muchemi'), member(P.brianFees, 'u-brian', 'Brian', 'Otieno'), member('aisha-fees', 'u-aisha', 'Aisha', 'Kamau'), member('njeri-fees', 'u-njeri', 'Njeri', 'Wambui')];

function theRecord(release2On = true) {
  return new Proxy({
    organization: { findUnique: jest.fn(async () => ({ release2CollectionsOn: release2On, release1SalesBoardOn: true })) },
    workItem: { findMany: jest.fn(async ({ where }: any) => [FN005, THIRD].filter((b) => !where?.groundId?.in || where.groundId.in.includes(b.groundId))) },
    groundParticipant: {
      findUnique: jest.fn(async ({ where }: any) => PEOPLE[where.id] ?? null),
      findFirst: jest.fn(async ({ where }: any) => (where.userId === 'u-wanjiru' ? { id: where.groundId === LIT ? P.wanjiruLit : P.wanjiruFees } : null)),
      findMany: jest.fn(async ({ where }: any) => (where?.groundId === FEES ? ROSTER : [])),
    },
    ground: { findUnique: jest.fn(async () => ({ initiatorId: 'u-wanjiru' })), findMany: jest.fn(async () => [{ id: FEES, label: 'Fee notes', initiatorId: 'u-wanjiru', organizationId: ORG, scenario: 'COLLECTIONS' }]) },
    user: { findUnique: jest.fn(async () => ({ email: 'wanjiru@muchemi.test', deletedAt: null })) },
  } as any, { get: (t: any, k: string) => t[k] ?? new Proxy({}, { get: (_x: any, m: string) => jest.fn(async () => (m === 'findMany' ? [] : m === 'count' ? 0 : null)) }) });
}
const LEAD = { userId: 'u-wanjiru', organizationId: ORG, grounds: [{ id: FEES, label: 'Fee notes', scenario: 'COLLECTIONS', overWhatsApp: true, timelineDays: 90, cadence: 'WEEKLY' }] };
const FN005_SAID = 'FN-005 for Kasarani Foods fell due on Tuesday 13 October, when Brian Otieno said in “Litigation team daily” that the reply was filed. Brian Otieno follows it up.';
const THIRD_SAID = 'The third Kasarani Foods fee note can be raised now, because David Mwangi said in “Litigation team daily” on Wednesday 14 October that the hearing date was set.';

describe('the partner is told a fee note fell due on an event', () => {
  it('Wanjiru\'s summary on Thursday 15 October says both, under what needs her', async () => {
    const now = new Date('2026-10-15T05:00:00Z');
    const o = await whatIsOutstandingFor(theRecord(), LEAD as any, { boards: {} as any, release: new Date('2026-01-01') }, now);
    expect(o.needsYou.map((t) => t.text)).toEqual(expect.arrayContaining([FN005_SAID, THIRD_SAID]));
    const said = theTemplateParagraph('Wanjiru', withPlacesWhereTheyTellApart(theseForAPhone(o)), 'http://localhost:5197/today').params[1];
    expect(said).toContain('FN-005 for Kasarani Foods fell due on Tuesday 13 October');
  });

  it('her Friday letter says both first in what moved', async () => {
    const sent: string[][] = [];
    await sendTheLeadsWeeklyLetters({ prisma: theRecord(), email: { sendTheLeadsWeeklyLetter: jest.fn(async (_t: string, _s: string, lines: string[]) => { sent.push(lines); }) }, frontendUrl: 'http://localhost:5197', everyCheckIn: { anchorIsOn: false, weeklyReport: async () => ({ moved: ['Aisha Kamau is no longer waiting on the client\'s HR manager for the witness statements from the client.'], toDo: [] }) } }, new Date('2026-10-16T14:00:00Z'));
    const moved = (sent[0] ?? []).find((l) => l.startsWith('Here is what moved this week.')) ?? '';
    expect(moved).toBe(`Here is what moved this week. ${FN005_SAID} ${THIRD_SAID} Aisha Kamau is no longer waiting on the client's HR manager for the witness statements from the client.`);
  });

  it('with the old Release 2 column off, fee notes are still said (always on since 15 November; the column is no longer read)', async () => {
    const now = new Date('2026-10-15T05:00:00Z');
    const o = await whatIsOutstandingFor(theRecord(false), LEAD as any, { boards: {} as any, release: new Date('2026-01-01') }, now);
    expect(o.needsYou.map((t) => t.text).join(' ')).toContain('FN-005');
  });
});
