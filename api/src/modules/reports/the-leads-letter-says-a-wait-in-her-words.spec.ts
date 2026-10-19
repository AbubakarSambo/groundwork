import { PartyType } from '@prisma/client';
import { forTheLeadFrom, type Reader } from './what-today-reads-from-the-record';
import { whatTheLeadsWeeklyReportSays } from '../engagement/the-leads-own-weekly-report';

/**
 * WANJIRU'S WEEKLY LETTER, FRIDAY 16 OCTOBER (Muchemi & Co., messages test, fourth run). It said "Decide what to do about proof of
 * payment. Aisha Kamau cannot move until it is settled, and it is waiting on Mr." (Mr. Baraka), and "Decide what to do about a response
 * to my reminder." (Aisha's own words, "my reminder"). From the record's own waits, as her list is built for her letter.
 */
const person = (id: string, userId: string, partyType: PartyType, first: string, last: string, t: number) => ({
  id, userId, partyType, email: null, roleAsDescribed: null, nameGiven: null, organisationGiven: null, managingOnly: false,
  createdAt: new Date(2026, 9, 1, 0, t), user: { firstName: first, lastName: last },
});
const PEOPLE = [person('p-wanjiru', 'u-wanjiru', PartyType.INITIATOR, 'Wanjiru', 'Muchemi', 0), person('p-aisha', 'u-aisha', PartyType.PARTICIPANT, 'Aisha', 'Kamau', 1)];
const WAIT = (id: string, what: string, onLabel: string) => ({ id, fromParticipantId: 'p-aisha', onParticipantId: null, onLabel, what, status: 'BLOCKING', blockerKind: null, then: null, createdAt: new Date('2026-10-12T08:41:28.189Z'), clearedAt: null });

async function wanjirusList() {
  const ground = { initiatorId: 'u-wanjiru', organizationId: 'org', kindOfWork: 'collections', whoSeesTargets: 'THEIR_OWN', participants: PEOPLE, dependencies: [WAIT('w-proof', 'proof of payment', 'Mr. Baraka'), WAIT('w-reminder', 'a response to my reminder', 'Upendo Schools')], objectives: [], personObjectives: [] };
  const prisma: any = {
    report: { findUnique: jest.fn(async () => ({ divergences: [] })) },
    checkIn: { findMany: jest.fn(async () => [{ participantId: 'p-aisha' }]) },
    organization: { findUnique: jest.fn(async () => ({ release1SalesBoardOn: false })) },
    groundContextItem: { findMany: async () => [] },
    wordedLine: { findUnique: async () => null },
  };
  const reader: Reader = { userId: 'u-wanjiru', isAdmin: false };
  const nameOf = (pid: string) => { const p = PEOPLE.find((x) => x.id === pid); return p ? `${p.user.firstName} ${p.user.lastName}` : 'a colleague'; };
  return (await forTheLeadFrom(prisma, 'g-fees', { ground, participants: PEOPLE, checkIns: [], nameOf } as any, reader, 8))!;
}

describe("Wanjiru's list of what to do this week", () => {
  it('"my reminder" is Aisha Kamau\'s, never said in Wanjiru\'s letter as hers', async () => {
    const item = (await wanjirusList()).find((x) => x.decide.includes('reminder'))!;
    expect(item.decide).toBe('Decide what to do about a response to Aisha Kamau’s reminder.');
  });
  it('the letter keeps "Mr. Baraka" whole', async () => {
    const item = (await wanjirusList()).find((x) => x.decide.includes('proof of payment'))!;
    expect(item.why).toBe('Aisha Kamau cannot move until it is settled, and it is waiting on Mr. Baraka.');
    const letter = whatTheLeadsWeeklyReportSays({ weekStart: '2026-10-12', forNextWeek: [{ do: item.decide, why: `${item.why} Once it is settled, I can close it.` }] }, new Date('2026-10-16T14:00:00Z'))!;
    expect(letter.toDo[0].why).toBe('Aisha Kamau cannot move until it is settled, and it is waiting on Mr. Baraka.');
  });
});
