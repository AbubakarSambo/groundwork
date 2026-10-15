import { ReportsService } from './reports.service';
import { GroundScenario, PartyType } from '@prisma/client';

/**
 * WHAT RUKIA SAID STAYS IN THE REPORT, FOR EVERY READER. Screens request 77, 29 September 2026.
 *
 * The same rule as the board (board/their-own-words-stay): the last read of a report takes out a
 * sentence giving a target the reader may not see, and a private file's name. It took Rukia's own
 * "Four shops for me." out of "What each person said" for Juma, an admin who only reads, and for
 * Baraka, a colleague, because her target is four and is hers alone. Now her lines stay as she said
 * them, a private file's name inside one of them is still hidden, and a sentence the report writes
 * about her target still goes.
 */
const person = (id: string, userId: string, first: string, last: string, partyType: PartyType = PartyType.PARTICIPANT) => ({
  id, userId, partyType, createdAt: new Date('2026-09-01T10:00:00Z'), email: `${id}@baridi.test`, nameGiven: null,
  organisationGiven: null, roleAsDescribed: 'sales', remitAsGiven: null, user: { firstName: first, lastName: last },
});
const GROUND = {
  initiatorId: 'u-amina', organizationId: 'org-1', whoSeesTargets: 'THEIR_OWN', scenario: GroundScenario.OKR_ALIGNMENT, peersVisibleToEachOther: true,
  participants: [person('p-amina', 'u-amina', 'Amina', 'Wanjiru', PartyType.INITIATOR), person('p-rukia', 'u-rukia', 'Rukia', 'Mwangi'), person('p-baraka', 'u-baraka', 'Baraka', 'Otieno')],
  objectives: [{ ownerParticipantId: 'p-rukia', target: 4 }],
};
const SHE_SAID = ['Four shops for me.', 'Baraka has four shops in Westlands and Neema has four in Karen.', 'As team-plan.txt says, four shops each by Friday.'];
const SERVED = () => ({
  whatEachPersonSaid: [{ who: 'Rukia Mwangi', isYou: false, lines: [...SHE_SAID], lineMarks: ['said', 'memory', 'memory'] }],
  whereThingsStand: { saying: 'Rukia Mwangi is at 1 of 4 shops. Baraka is waiting on stock.' },
});

function asReader(userId: string, role: string) {
  const svc = Object.create(ReportsService.prototype) as any;
  svc.prisma = {
    ground: { findUnique: jest.fn(async () => JSON.parse(JSON.stringify(GROUND))) },
    groundDocument: { findMany: jest.fn(async () => [{ fileName: 'team-plan.txt', visibility: 'OWN', participantId: 'p-amina' }]) },
    personObjective: { findMany: jest.fn(async () => []) },
    user: { findUnique: jest.fn(async () => ({ role, organizationId: 'org-1' })) },
  };
  return svc.whatTheLeadHasNotShared('g-1', userId, 'org-1', SERVED()) as Promise<any>;
}

describe("Rukia's own lines in the report", () => {
  it('Juma, an admin who only reads, reads each line, with only the file name hidden, and not the report\'s sentence with her 4', async () => {
    const r = await asReader('u-juma', 'ADMIN');
    expect(r.whatEachPersonSaid[0].lines).toEqual([
      'Four shops for me.',
      'Baraka has four shops in Westlands and Neema has four in Karen.',
      'As a document says, four shops each by Friday.',
    ]);
    expect(r.whatEachPersonSaid[0].lineMarks).toHaveLength(3);
    expect(r.whereThingsStand.saying).toBe('Baraka is waiting on stock.');
  });

  it('Baraka, a colleague, reads the same', async () => {
    const r = await asReader('u-baraka', 'MEMBER');
    expect(r.whatEachPersonSaid[0].lines).toEqual([
      'Four shops for me.',
      'Baraka has four shops in Westlands and Neema has four in Karen.',
      'As a document says, four shops each by Friday.',
    ]);
    expect(r.whereThingsStand.saying).toBe('Baraka is waiting on stock.');
  });

  it('Amina, who runs it and owns the file, reads everything as it is', async () => {
    const r = await asReader('u-amina', 'MEMBER');
    expect(r.whatEachPersonSaid[0].lines).toEqual(SHE_SAID);
    expect(r.whereThingsStand.saying).toBe('Rukia Mwangi is at 1 of 4 shops. Baraka is waiting on stock.');
  });
});
