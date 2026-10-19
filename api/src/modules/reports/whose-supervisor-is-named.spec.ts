import { PartyType } from '@prisma/client';
import { forTheLeadFrom, type Reader } from './what-today-reads-from-the-record';
import { aHolderSaidWithWhose } from '../board/a-holder-in-their-own-words';

/**
 * NAME WHOSE SUPERVISOR (Hafsah, 19 October, point 6: "The weekly letter never puts a team member's words in the lead's mouth. Name whose
 * supervisor."; messages test after the fixes, finding 9).
 *
 * Muchemi & Co. (test). On Monday 12 October David Mwangi said in "Litigation team daily" "I don't have a clear role defined for this
 * claim yet." and "I don't know who my supervisor is yet.", and the record kept a wait for "a clear role defined for the Jamii Clinics
 * employment claim" on "my supervisor". Wanjiru's weekly letter of Friday 16 October read "Decide what to do about a clear role defined
 * for the Jamii Clinics employment claim. David Mwangi cannot move until it is settled, and it is waiting on my supervisor." Read here as
 * her list is built, for her letter and her Today.
 */
const person = (id: string, userId: string, partyType: PartyType, first: string, last: string, t: number) => ({
  id, userId, partyType, email: null, roleAsDescribed: null, nameGiven: null, organisationGiven: null, managingOnly: false,
  createdAt: new Date(2026, 9, 1, 0, t), user: { firstName: first, lastName: last },
});
const WANJIRU = person('p-wanjiru', 'u-wanjiru', PartyType.INITIATOR, 'Wanjiru', 'Muchemi', 0);
const DAVID = person('p-david', 'u-david', PartyType.PARTICIPANT, 'David', 'Mwangi', 1);
const PEOPLE = [WANJIRU, DAVID];
const THE_WAIT = { id: '77a678f8-d558-4369-b8e3-8dad3efb432c', fromParticipantId: 'p-david', onParticipantId: null, onLabel: 'my supervisor', what: 'a clear role defined for the Jamii Clinics employment claim', status: 'BLOCKING', blockerKind: null, then: null, createdAt: new Date('2026-10-12T08:04:34.507Z'), clearedAt: null };

async function wanjirusList() {
  const ground = { initiatorId: 'u-wanjiru', organizationId: 'org', kindOfWork: 'a law firm matter', whoSeesTargets: 'THEIR_OWN', participants: PEOPLE, dependencies: [THE_WAIT], objectives: [], personObjectives: [] };
  const prisma: any = {
    report: { findUnique: jest.fn(async () => ({ divergences: [] })) },
    checkIn: { findMany: jest.fn(async () => [{ participantId: 'p-david' }]) },
    organization: { findUnique: jest.fn(async () => ({ release1SalesBoardOn: false })) },
    groundContextItem: { findMany: async () => [] },
    wordedLine: { findUnique: async () => null },
  };
  const reader: Reader = { userId: 'u-wanjiru', isAdmin: false };
  const nameOf = (pid: string) => { const p = PEOPLE.find((x) => x.id === pid); return p ? `${p.user.firstName} ${p.user.lastName}` : 'a colleague'; };
  return (await forTheLeadFrom(prisma, 'g-lit', { ground, participants: PEOPLE, checkIns: [], nameOf } as any, reader, 8))!;
}

describe('the thing for Wanjiru to do about David\'s wait', () => {
  it('names whose supervisor it is waiting on, never "my supervisor" in her letter', async () => {
    const item = (await wanjirusList()).find((x) => x.decide.includes('a clear role defined'))!;
    expect(item.decide).toBe('Decide what to do about a clear role defined for the Jamii Clinics employment claim.');
    expect(item.why).toBe('David Mwangi cannot move until it is settled, and it is waiting on David Mwangi’s supervisor.');
    expect(JSON.stringify(item)).not.toMatch(/\bmy supervisor\b/);
  });
  it('to the person waiting it is "your supervisor"; with no name to give, "their own supervisor"', () => {
    expect(aHolderSaidWithWhose('my supervisor', 'David Mwangi', true)).toBe('your supervisor');
    expect(aHolderSaidWithWhose('my supervisor', null)).toBe('their own supervisor');
    expect(aHolderSaidWithWhose('The customers', 'Femi')).toBe('the customers');
  });
});
