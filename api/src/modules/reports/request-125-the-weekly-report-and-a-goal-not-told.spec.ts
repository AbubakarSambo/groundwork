import { TheWeeklyReportService } from './the-weekly-report.service';
import { PartyType } from '@prisma/client';

/**
 * REQUEST 125, FINDING 1 (decisions 48 and 56). The weekly report gave Tobi, Chidi and an admin who only reads the goal Amina
 * had not told Tobi about, in the numbers and in "what changed". Read here as each person, through the real read.
 */
const AMINA = 'u-amina', TOBI = 'u-tobi', CHIDI = 'u-chidi', ADMIN = 'u-admin', SETUP = 'u-setup';
const person = (id: string, userId: string, partyType: PartyType, first: string, last: string, t: number) => ({ id, userId, email: `${id}@x.test`, partyType, roleAsDescribed: null, nameGiven: null, organisationGiven: null, createdAt: new Date(2026, 8, 1, 0, t), user: { firstName: first, lastName: last, email: null } });
const people = () => [person('p-amina', AMINA, PartyType.INITIATOR, 'Amina', 'Bello', 0), person('p-tobi', TOBI, PartyType.PARTICIPANT, 'Tobi', 'Adewale', 1), person('p-chidi', CHIDI, PartyType.PARTICIPANT, 'Chidi', 'Okafor', 2)];
const RECENT = new Date(Date.now() - 2 * 86400000);
const GOALS = [
  { id: 'o1', groundId: 'g1', participantId: 'p-tobi', text: 'Close eight renewals a quarter.', awareness: 'NOT_TOLD', authoredBy: 'lead', createdAt: RECENT },
  { id: 'o2', groundId: 'g1', participantId: 'p-tobi', text: 'Lead the client conversations fully.', awareness: 'TOLD', authoredBy: 'lead', createdAt: RECENT },
];
const target = (id: string, name: string, n: number, count: number) => ({ id, name, target: n, direction: 'AIM', ownerParticipantId: 'p-tobi', isADecisionAboutAPerson: false, setByTheHolder: false, count, from: 1 });
const facts = {
  version: 2, cadence: 'WEEKLY', lastAt: new Date().toISOString(), periods: [1], eachPerson: [], checkIns: { due: 2, made: 2 }, counts: [],
  targets: [target('go1', 'Tobi to close 8 renewals per quarter.', 8, 2), target('go2', 'Lead the client conversations fully.', 3, 1)],
  namedByMoreThanOne: [], settled: [], open: [], cleared: [], forTheLead: [],
};

async function readAs(userId: string, role: string, createdBy = AMINA) {
  const prisma: any = {
    ground: { findUnique: async () => ({ organizationId: 'org1', initiatorId: AMINA, createdByUserId: createdBy, scenario: 'OKR_ALIGNMENT', peersVisibleToEachOther: true, whoSeesTargets: 'EVERYBODY', cadence: 'WEEKLY', status: 'ACTIVE', approvedById: null, participants: people() }) },
    weeklyReport: { findFirst: async () => ({ weekStart: '2026-09-28', builtAt: new Date(), eachPerson: facts }), findUnique: async () => null },
    patternDetection: { findMany: async () => [] },
    organizationMembership: { findFirst: async () => null, findMany: async () => [] },
    person: { findFirst: async () => null, findMany: async () => [] },
    user: { findUnique: async () => ({ role, organizationId: 'org1' }) },
    personObjective: { findMany: async (q: any) => GOALS.filter((g) => !q?.where?.awareness || g.awareness === q.where.awareness) },
  };
  return new TheWeeklyReportService(prisma).read('g1', { userId, role, organizationId: 'org1' });
}
const said = (o: any) => JSON.stringify(o);

describe('the weekly report and a goal Amina has not told Tobi about', () => {
  it.each([['Tobi', TOBI, 'MEMBER', AMINA], ['Chidi, a colleague', CHIDI, 'MEMBER', AMINA]] as [string, string, string, string][])('%s does not read it, in the numbers or in what changed', async (_n, u, r, c) => {
    const out: any = await readAs(u, r, c);
    expect(said(out)).not.toMatch(/8 renewals/);
    /* ... and the goal Amina did tell Tobi about is still there. */
    expect(said(out.inNumbers)).toContain('lead the client conversations fully');
  });

  it('an admin of the organisation who only reads reads it too (decisions 5 and 86)', async () => {
    const out: any = await readAs(ADMIN, 'ADMIN', AMINA);
    expect(said(out)).toContain('8 renewals per quarter');
    expect(said(out.inNumbers)).toContain('lead the client conversations fully');
  });

  it('Amina, and the admin who set the check-in up, read it', async () => {
    expect(said(await readAs(AMINA, 'MEMBER'))).toContain('8 renewals per quarter');
    expect(said(await readAs(SETUP, 'ADMIN', SETUP))).toContain('8 renewals per quarter');
  });

  it('what Tobi reads of a goal he was told about is a full sentence, never "You to close ..."', async () => {
    const told = { ...facts, targets: [target('go1', 'Tobi to close 8 renewals per quarter.', 8, 2)] };
    const prisma: any = {
      ground: { findUnique: async () => ({ organizationId: 'org1', initiatorId: AMINA, createdByUserId: AMINA, scenario: 'OKR_ALIGNMENT', peersVisibleToEachOther: true, whoSeesTargets: 'EVERYBODY', cadence: 'WEEKLY', status: 'ACTIVE', approvedById: null, participants: people() }) },
      weeklyReport: { findFirst: async () => ({ weekStart: '2026-09-28', builtAt: new Date(), eachPerson: told }), findUnique: async () => null },
      patternDetection: { findMany: async () => [] }, organizationMembership: { findFirst: async () => null, findMany: async () => [] }, person: { findFirst: async () => null, findMany: async () => [] },
      user: { findUnique: async () => ({ role: 'MEMBER', organizationId: 'org1' }) }, personObjective: { findMany: async () => [] },
    };
    const out: any = await new TheWeeklyReportService(prisma).read('g1', { userId: TOBI, role: 'MEMBER', organizationId: 'org1' });
    expect(out.whatChanged.result[0]).toBe('You need to close 8 renewals per quarter. Your count went from 1 to 2 this week.');
    expect(out.inNumbers[1].of).toBe('close 8 renewals per quarter, your own number');
    const asAmina: any = await new TheWeeklyReportService({ ...prisma, user: { findUnique: async () => ({ role: 'MEMBER', organizationId: 'org1' }) } }).read('g1', { userId: AMINA, role: 'MEMBER', organizationId: 'org1' });
    expect(asAmina.whatChanged.result[0]).toBe("Tobi needs to close 8 renewals per quarter. Tobi Adewale's count went from 1 to 2 this week.");
  });
});
