import { GroundsService } from './grounds.service';

/**
 * REQUEST 104: `mayChangeSetup` ON GET /grounds/:id, TRUE ONLY FOR WHOEVER DECISIONS 63 AND 72 ALLOW.
 *
 * The brief's own rule is decision 72 (whose-words-the-brief-is.spec). The Context page offers
 * "Rewrite" and "Write the brief" from `mayChangeSetup`; until it was served, only the lead was offered
 * either, even once the lead had left and an admin was the one person the server would let through.
 */
const WANJIRU = 'u-wanjiru'; // the lead
const AISHA = 'u-aisha'; // checks in
const OTIENO = 'u-otieno'; // an admin of the organisation who only reads
const SETUP = 'u-setup'; // the admin who set it up for Wanjiru
const KWAME = 'u-kwame'; // the person reviewed, on an evaluation check-in
const STRANGER = 'u-stranger'; // an admin of another organisation

function getAs(userId: string, { leadHasLeft = false, scenario = 'OKR_ALIGNMENT' } = {}) {
  const people: Record<string, any> = {
    [WANJIRU]: { role: 'MEMBER', organizationId: 'org1', firstName: 'Wanjiru', lastName: 'Mwangi', isActive: !leadHasLeft },
    [AISHA]: { role: 'MEMBER', organizationId: 'org1', firstName: 'Aisha', lastName: 'Otieno', isActive: true },
    [OTIENO]: { role: 'ADMIN', organizationId: 'org1', firstName: 'Otieno', lastName: 'Kamau', isActive: true },
    [SETUP]: { role: 'ADMIN', organizationId: 'org1', firstName: 'Neema', lastName: 'Achieng', isActive: true },
    [KWAME]: { role: 'MEMBER', organizationId: 'org1', firstName: 'Kwame', lastName: 'Mensah', isActive: true },
    [STRANGER]: { role: 'ADMIN', organizationId: 'org2', firstName: 'Sam', lastName: 'Other', isActive: true },
  };
  const ground: any = {
    id: 'g1', organizationId: 'org1', scenario, initiatorId: WANJIRU, createdByUserId: SETUP, createdAt: new Date(), timelineDays: null,
    restrictExternalVisibility: false, peersVisibleToEachOther: true, whoSeesTargets: 'THEIR_OWN',
    brief: 'Twenty-five water pumps this quarter.', toldToParticipants: null, groundAuditLog: null,
    participants: [
      { id: 'p-w', userId: WANJIRU, email: 'w@x.test', partyType: 'INITIATOR', roleAsDescribed: null, createdAt: new Date(), user: { firstName: 'Wanjiru', lastName: 'Mwangi' } },
      { id: 'p-a', userId: AISHA, email: 'a@x.test', partyType: 'PARTICIPANT', roleAsDescribed: null, createdAt: new Date(), user: { firstName: 'Aisha', lastName: 'Otieno' } },
      { id: 'p-k', userId: KWAME, email: 'k@x.test', partyType: 'PARTICIPANT', roleAsDescribed: null, createdAt: new Date(), user: { firstName: 'Kwame', lastName: 'Mensah' } },
    ],
    checkIns: [], resolution: null, patternDetections: [], objectives: [],
    report: { id: 'r1', releasedAt: new Date(), sharedPicture: null, createdAt: new Date() },
  };
  const prisma: any = {
    groundBaseline: { findFirst: jest.fn(async () => null) },
    personObjective: { findMany: jest.fn(async () => []) },
    ground: { findFirst: async () => ground, findUnique: async () => ground },
    user: { findUnique: jest.fn(async (a: any) => people[a.where.id] ?? null) },
    groundParticipant: { findFirst: async () => null, findMany: async () => [] },
    organization: { findUnique: async () => ({ subscriptionPlan: 'FREE', subscriptionStatus: 'ACTIVE', freeExtensionUsed: false }) },
    leadContextNote: { findMany: async () => [] },
    leadSetupWords: { findUnique: jest.fn(async () => null) },
  };
  return new GroundsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, { respond: async () => '' } as any)
    .get('g1', 'org1', userId) as Promise<any>;
}

describe('request 104: who is offered "Rewrite", as each reader is sent it', () => {
  it('Wanjiru, the lead, may change the setup', async () => {
    expect((await getAs(WANJIRU)).mayChangeSetup).toBe(true);
  });

  it.each([
    ['Aisha, who checks in', AISHA],
    ['Otieno, an admin who only reads', OTIENO],
    ['Neema, the admin who set it up', SETUP],
  ])('%s may not, while Wanjiru is still in the organisation', async (_who, userId) => {
    expect((await getAs(userId)).mayChangeSetup).toBe(false);
  });

  it('Kwame, the person reviewed on an evaluation check-in, may not', async () => {
    expect((await getAs(KWAME, { scenario: 'PIP' })).mayChangeSetup).toBe(false);
    expect((await getAs(KWAME, { scenario: 'PIP', leadHasLeft: true })).mayChangeSetup).toBe(false);
  });

  it('once Wanjiru has left, an admin of the organisation may, the admin who set it up included', async () => {
    expect((await getAs(OTIENO, { leadHasLeft: true })).mayChangeSetup).toBe(true);
    expect((await getAs(SETUP, { leadHasLeft: true })).mayChangeSetup).toBe(true);
  });

  it('once Wanjiru has left, Aisha still may not', async () => {
    expect((await getAs(AISHA, { leadHasLeft: true })).mayChangeSetup).toBe(false);
  });
});
