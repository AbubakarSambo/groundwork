import { GroundsService } from './grounds.service';
import { ReportsService } from '../reports/reports.service';

/**
 * REQUEST 206: EACH ROW OF `GET /grounds` SAYS WHETHER THE LEAD HAS LEFT, AND WHETHER THIS READER MAY CHANGE THE SETUP (decision 119, H10).
 * Worked out as the check-in's own read does: the lead's account is read only for an admin of the organisation who is not the lead,
 * and nobody is let in on a guess.
 */
const LEAD = 'user-lead';
const MIRIAM = 'user-miriam';
const ADMIN = 'user-admin';

function ground(): any {
  const p = (id: string, userId: string, first: string, last: string, partyType = 'PARTICIPANT') => ({
    id, userId, email: `${first.toLowerCase()}@baridi.test`, partyType, createdAt: new Date('2026-09-01'), managingOnly: false,
    user: { firstName: first, lastName: last, awaitingOrgApproval: false },
  });
  return {
    id: 'g1', organizationId: 'org1', initiatorId: LEAD, createdByUserId: LEAD, label: 'Sales team, Q3', status: 'ACTIVE',
    scenario: 'OKR_ALIGNMENT', cadence: 'WEEKLY', timelineDays: 84, updatedAt: new Date('2026-09-20'), peersVisibleToEachOther: true,
    participants: [p('p-lead', LEAD, 'Wairimu', 'Kamau', 'INITIATOR'), p('p-miriam', MIRIAM, 'Miriam', 'Wanjiku')],
    checkIns: [], report: null, reportRounds: [], reportActivations: [], dependencies: [],
  };
}

async function rowAs(userId: string, role: string, leadIsActive: boolean) {
  const prisma: any = {
    ground: { findMany: jest.fn().mockResolvedValue([ground()]) },
    groundParticipant: { updateMany: jest.fn().mockResolvedValue({ count: 0 }), findMany: jest.fn().mockResolvedValue([]) },
    user: { findMany: jest.fn().mockResolvedValue([{ id: LEAD, isActive: leadIsActive, firstName: 'Wairimu', lastName: 'Kamau' }]) },
    membershipRequest: { findMany: jest.fn().mockResolvedValue([]) },
  };
  const reports = new ReportsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any);
  const svc = new GroundsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, { get: () => reports } as any);
  const [row] = (await svc.list('org1', userId, `${userId}@baridi.test`, role)) as any[];
  return row;
}

describe('request 206: the list says whether the lead has left', () => {
  it('an admin who does not run it reads that Wairimu has left, and may change the setup', async () => {
    const row = await rowAs(ADMIN, 'ADMIN', false);
    expect(row.leadHasLeft).toBe(true);
    expect(row.mayChangeSetup).toBe(true);
  });
  it('while Wairimu is still in the organisation the same admin reads that she has not left, and may not', async () => {
    const row = await rowAs(ADMIN, 'ADMIN', true);
    expect(row.leadHasLeft).toBe(false);
    expect(row.mayChangeSetup).toBe(false);
  });
  it('Miriam, who checks in, is told nothing about it even when Wairimu has left, and may not change the setup', async () => {
    const row = await rowAs(MIRIAM, 'MEMBER', false);
    expect(row.leadHasLeft).toBe(false);
    expect(row.mayChangeSetup).toBe(false);
  });
  it('Wairimu, who runs it, may change the setup', async () => {
    const row = await rowAs(LEAD, 'MEMBER', true);
    expect(row.mayChangeSetup).toBe(true);
    expect(row.leadHasLeft).toBe(false);
  });
});
