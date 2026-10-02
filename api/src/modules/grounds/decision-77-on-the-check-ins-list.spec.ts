import { GroundsService } from './grounds.service';
import { ReportsService } from '../reports/reports.service';

/**
 * DECISION 77 ON THE CHECK-INS LIST (2 October 2026). Wairimu runs "Sales team, Q3"; Miriam and Omar
 * check in and have answered session 1; an admin has not let Faraji Odhiambo in. The row's count leaves
 * him out for every reader, and only whoever runs it, the admin who set it up and an admin read
 * `waitingToBeLetIn`. A person who checks in never does, whether or not people see each other.
 */
const LEAD = 'user-lead';
const MIRIAM = 'user-miriam';
const ADMIN = 'user-admin';
const SETUP = 'user-setup';

function ground(over: { held?: boolean; peers?: boolean } = {}): any {
  const held = over.held ?? true;
  const p = (id: string, userId: string, first: string, last: string, partyType = 'PARTICIPANT', waiting = false) => ({
    id, userId, email: `${first.toLowerCase()}@baridi.test`, partyType, createdAt: new Date('2026-09-01'), managingOnly: partyType === 'INITIATOR',
    user: { firstName: first, lastName: last, awaitingOrgApproval: waiting },
  });
  const done = (id: string, pid: string) => ({ id, participantId: pid, sessionNumber: 1, status: 'COMPLETED', isSetup: false, createdAt: new Date('2026-09-21'), completedAt: new Date('2026-09-23'), availableFrom: new Date('2026-09-21') });
  return {
    id: 'g1', organizationId: 'org1', initiatorId: LEAD, createdByUserId: SETUP, label: 'Sales team, Q3', status: 'ACTIVE',
    scenario: 'OKR_ALIGNMENT', cadence: 'WEEKLY', timelineDays: 84, updatedAt: new Date('2026-09-20'), peersVisibleToEachOther: over.peers ?? true,
    participants: [
      p('p-lead', LEAD, 'Wairimu', 'Kamau', 'INITIATOR'),
      p('p-miriam', MIRIAM, 'Miriam', 'Wanjiku'),
      p('p-omar', 'user-omar', 'Omar', 'Ali'),
      p('p-faraji', 'user-faraji', 'Faraji', 'Odhiambo', 'PARTICIPANT', held),
    ],
    checkIns: [
      { ...done('c-lead', 'p-lead') }, done('c-miriam', 'p-miriam'), done('c-omar', 'p-omar'),
      { id: 'c-faraji', participantId: 'p-faraji', sessionNumber: 1, status: 'NOT_STARTED', isSetup: false, createdAt: new Date('2026-09-21'), completedAt: null, availableFrom: new Date('2026-09-21') },
    ],
    report: null, reportRounds: [], reportActivations: [], dependencies: [],
  };
}

async function rowAs(userId: string, role: string, over: { held?: boolean; peers?: boolean; declined?: boolean } = {}) {
  const prisma: any = {
    ground: { findMany: jest.fn().mockResolvedValue([ground(over)]) },
    groundParticipant: { updateMany: jest.fn().mockResolvedValue({ count: 0 }), findMany: jest.fn().mockResolvedValue([]) },
    user: { findMany: jest.fn().mockResolvedValue([]) },
    membershipRequest: { findMany: jest.fn().mockResolvedValue(over.declined ? [{ userId: 'user-faraji', status: 'DECLINED', decidedByUserId: ADMIN, decidedAt: new Date('2026-09-29') }] : []) },
  };
  const reports = new ReportsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any);
  const svc = new GroundsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, { get: () => reports } as any);
  const [row] = (await svc.list('org1', userId, `${userId}@baridi.test`, role)) as any[];
  return row;
}

describe('decision 77 on the check-ins list', () => {
  it.each([['Wairimu, who runs it', LEAD, 'MEMBER'], ['the admin who set it up', SETUP, 'ADMIN'], ['an admin', ADMIN, 'ADMIN']] as const)(
    '%s reads 3 of 3 answered and "Faraji Odhiambo is waiting to be let in."',
    async (_who, userId, role) => {
      const row = await rowAs(userId, role);
      expect([row.glance.progress.answeredThisRound, row.glance.progress.ofPeople]).toEqual([3, 3]);
      expect(row.glance.progress.waitingOn).not.toContain('p-faraji');
      expect(row.waitingToBeLetIn).toBe('Faraji Odhiambo is waiting to be let in.');
    },
  );

  it('after a decline, Wairimu and an admin read "Faraji Odhiambo was not let in."', async () => {
    expect((await rowAs(LEAD, 'MEMBER', { declined: true })).waitingToBeLetIn).toBe('Faraji Odhiambo was not let in.');
    expect((await rowAs(ADMIN, 'ADMIN', { declined: true })).waitingToBeLetIn).toBe('Faraji Odhiambo was not let in.');
  });

  it.each([
    ['people see each other, still waiting', { peers: true }],
    ['people see each other, after a decline', { peers: true, declined: true }],
    ['people see only themselves, still waiting', { peers: false }],
    ['people see only themselves, after a decline', { peers: false, declined: true }],
  ] as const)('Miriam, who checks in, reads nothing about it (%s), and no count of hers includes him', async (_case, over) => {
    const row = await rowAs(MIRIAM, 'MEMBER', over);
    expect(row.waitingToBeLetIn).toBeNull();
    expect(JSON.stringify(row)).not.toMatch(/let in/);
    /* Where people see each other her count is the team's, without him. Where they see only themselves the
       list counts her own rows only, as before. */
    if (over.peers) expect(row.glance.progress.ofPeople).toBe(3);
    expect(row.glance.progress.waitingOn).not.toContain('p-faraji');
  });

  it('once he is let in, he is counted again (3 of 4) and nobody is told he is waiting', async () => {
    const row = await rowAs(LEAD, 'MEMBER', { held: false });
    expect([row.glance.progress.answeredThisRound, row.glance.progress.ofPeople]).toEqual([3, 4]);
    expect(row.waitingToBeLetIn).toBeNull();
  });
});
