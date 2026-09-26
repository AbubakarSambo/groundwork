import { GroundsService } from './grounds.service';

/**
 * THE CHECK-INS LIST GIVES EACH READER ONLY WHAT THE CHECK-IN'S OWN PAGE WOULD (C1, U.5).
 *
 * `list()` used to send the whole row to every reader. So a participant, even the person a
 * probation check-in is about, was handed the broadcast join link, everybody's email address while
 * the lead keeps them private, and the report's agreements and differences before the report was
 * released to them. Asserted on the real `list()` output, for each reader.
 */

const LEAD = 'user-lead';
const PART = 'user-part';
const ADMIN = 'user-admin';

function ground(): any {
  return {
    id: 'g1', organizationId: 'org1', initiatorId: LEAD, label: 'Sales team, Q3', status: 'ACTIVE',
    scenario: 'OKR_ALIGNMENT', cadence: 'WEEKLY', timelineDays: 84, updatedAt: new Date('2026-09-20'),
    joinToken: 'secret-join-token', groundAuditLog: [{ what: 'renamed' }], restrictExternalVisibility: true,
    participants: [
      { id: 'p-lead', userId: LEAD, email: 'wairimu@baridi.test', partyType: 'INITIATOR', user: { firstName: 'Wairimu', lastName: 'Kamau' } },
      { id: 'p-part', userId: PART, email: 'miriam@baridi.test', partyType: 'PARTICIPANT', user: { firstName: 'Miriam', lastName: 'Wanjiku' } },
      { id: 'p-omar', userId: 'user-omar', email: 'omar@baridi.test', partyType: 'PARTICIPANT', user: { firstName: 'Omar', lastName: 'Ali' } },
    ],
    checkIns: [],
    report: { releasedAt: null, agreements: [{ text: 'Both agree the deck is late' }], divergences: [{ text: 'Unreleased difference' }] },
    reportRounds: [],
    dependencies: [],
    reportActivations: [],
  };
}

function serviceFor() {
  const prisma: any = {
    ground: { findMany: jest.fn().mockResolvedValue([ground()]) },
    groundParticipant: { updateMany: jest.fn().mockResolvedValue({ count: 0 }), findMany: jest.fn().mockResolvedValue([]) },
  };
  return new GroundsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any);
}

async function listAs(userId: string, role: string) {
  const [row] = (await serviceFor().list('org1', userId, `${userId}@baridi.test`, role)) as any[];
  return row;
}

describe('the check-ins list, as each reader gets it', () => {
  it('a participant gets no join link, nobody else\'s address, and no unreleased report text', async () => {
    const row = await listAs(PART, 'MEMBER');
    expect(row.joinToken).toBeUndefined();
    expect(row.groundAuditLog).toBeUndefined();
    const emails = Object.fromEntries(row.participants.map((p: any) => [p.id, p.email]));
    expect(emails).toEqual({ 'p-lead': null, 'p-part': 'miriam@baridi.test', 'p-omar': null });
    expect(row.report).toEqual({ releasedAt: null });
    expect(JSON.stringify(row)).not.toContain('Unreleased difference');
    /* Names stay: who is in the check-in is shown to the people in it. */
    expect(row.participants.map((p: any) => p.user?.firstName)).toEqual(['Wairimu', 'Miriam', 'Omar']);
  });

  it('the lead who runs it still gets the join link and everybody\'s address', async () => {
    const row = await listAs(LEAD, 'MEMBER');
    expect(row.joinToken).toBe('secret-join-token');
    expect(row.participants.every((p: any) => !!p.email)).toBe(true);
    expect(JSON.stringify(row)).not.toContain('Unreleased difference');
  });

  it('an admin of the organisation gets the join link, as on the check-in\'s own page, but not the hidden addresses', async () => {
    const row = await listAs(ADMIN, 'ADMIN');
    expect(row.joinToken).toBe('secret-join-token');
    expect(row.participants.filter((p: any) => p.email).length).toBe(0);
  });
});
