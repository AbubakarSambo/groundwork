import { PartyType } from '@prisma/client';
import { whatTheyOwnWhileAway, ownedInWords } from './what-they-own-while-away';

/**
 * REQUEST 125, FINDING 4 (decisions 48 and 56). Tobi has asked for leave. Amina has set him a target of eight renewals a quarter, due in
 * those days, and has not told him. The admin who only reads, and a lead of the same department, were told "Tobi's target
 * “Tobi to close 8 renewals per quarter” on ... is due on ...". Only Amina, who runs the check-in, reads it.
 */
const AMINA = 'u-amina', TOBI = 'u-tobi', ADMIN = 'u-admin', SETUP = 'u-setup', JUMA = 'u-juma';
const DUE = new Date(Date.now() + 5 * 86400000);
const GOAL = { id: 'pg-1', groundId: 'g1', participantId: 'p-tobi', text: 'Close eight renewals a quarter.', awareness: 'NOT_TOLD', authoredBy: 'lead', createdAt: new Date(Date.now() - 2 * 86400000) };
const TARGETS = [
  { name: 'Tobi to close 8 renewals per quarter.', dueOn: DUE, groundId: 'g1' },
  { name: 'Lead the client conversations fully.', dueOn: DUE, groundId: 'g1' },
];

async function readAs(userId: string, role: string, createdBy = AMINA) {
  const g = {
    id: 'g1', label: 'Engagement Director, first 90 days', organizationId: 'org1', initiatorId: AMINA, createdByUserId: createdBy, scenario: 'OKR_ALIGNMENT', status: 'ACTIVE', approvedById: null,
    participants: [AMINA, TOBI].map((u) => ({ userId: u, partyType: u === AMINA ? PartyType.INITIATOR : PartyType.PARTICIPANT, managingOnly: u === AMINA })),
  };
  const prisma: any = {
    commitment: { findMany: async () => [] }, subject: { findMany: async () => [] },
    groundParticipant: { findMany: async () => [{ id: 'p-tobi', groundId: 'g1' }] },
    groundObjective: { findMany: async () => TARGETS },
    personObjective: { findMany: async () => [GOAL] },
    workItem: { findMany: async () => [] },
    ground: { findMany: async () => [g] },
    person: { findMany: async () => [], findFirst: async () => null },
    organizationMembership: { findMany: async () => [], findFirst: async () => null },
  };
  return ownedInWords('Tobi', await whatTheyOwnWhileAway(prisma, { userId, organizationId: 'org1', role }, TOBI, new Date(), new Date(Date.now() + 10 * 86400000)));
}

describe('what Tobi owns while he is away, and a goal Amina has not told him about', () => {
  it.each([['a lead of the same department who is not in it', JUMA, 'LEAD']] as [string, string, string][])('%s does not read it', async (_n, u, r) => {
    const said = (await readAs(u, r)).join(' ');
    expect(said).not.toContain('8 renewals');
  });

  it('an admin of the organisation who only reads reads it, and the goal Tobi was told about (decisions 5 and 86)', async () => {
    const said = (await readAs(ADMIN, 'ADMIN')).join(' ');
    expect(said).toContain('8 renewals');
    expect(said).toContain('Lead the client conversations fully');
  });

  it('Amina, and the admin who set the check-in up, read both', async () => {
    for (const [u, r, c] of [[AMINA, 'LEAD', AMINA], [SETUP, 'ADMIN', SETUP]] as [string, string, string][]) {
      const said = (await readAs(u, r, c)).join(' ');
      expect(said).toContain('8 renewals');
      expect(said).toContain('Lead the client conversations fully');
    }
  });
});
