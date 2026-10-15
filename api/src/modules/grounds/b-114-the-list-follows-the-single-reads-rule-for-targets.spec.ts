import { GroundsService } from './grounds.service';
import { ReportsService } from '../reports/reports.service';

/**
 * B-114 (request 209). `GET /grounds`, the check-in list, gave a member every person's {ownerParticipantId, target} on a check-in where
 * people see only their own targets, while the single read gave her only hers. The list now applies the same rule as the single read.
 */
const LEAD = 'user-lead';
const MEMBER = 'user-amani';
const ADMIN_WHO_RUNS_IT = 'user-admin';
const ADMIN_WHO_JOINED = 'user-admin-joined';
const ADMIN_NOT_IN_IT = 'user-admin-outside';

function ground(over: any): any {
  const p = (id: string, userId: string, first: string, last: string, partyType = 'PARTICIPANT') => ({
    id, userId, email: `${first.toLowerCase()}@msingi.test`, partyType, createdAt: new Date('2026-09-01'), managingOnly: false,
    user: { firstName: first, lastName: last, awaitingOrgApproval: false },
  });
  const o = (id: string, owner: string | null, target: number) => ({ id, ownerParticipantId: owner, target, isADecisionAboutAPerson: false });
  return {
    id: 'g1', organizationId: 'org1', initiatorId: LEAD, createdByUserId: LEAD, label: 'Sales team, Q3', status: 'ACTIVE',
    scenario: 'OKR_ALIGNMENT', startedFrom: null, cadence: 'WEEKLY', timelineDays: 28, updatedAt: new Date('2026-09-20'), peersVisibleToEachOther: true,
    whoSeesTargets: 'THEIR_OWN',
    participants: [p('p-lead', LEAD, 'Neema', 'Mutua', 'INITIATOR'), p('p-amani', MEMBER, 'Amani', 'Yusuf'), p('p-baraka', 'user-baraka', 'Baraka', 'Otieno'), p('p-joined', ADMIN_WHO_JOINED, 'Grace', 'Achieng')],
    objectives: [o('o1', null, 100), o('o2', 'p-amani', 3), o('o3', 'p-baraka', 4), o('o4', 'p-joined', 5), o('o5', 'p-lead', 6)],
    checkIns: [], report: null, reportRounds: [], reportActivations: [], dependencies: [],
    ...over,
  };
}

async function rowAs(g: any, userId: string, role: string) {
  const prisma: any = {
    ground: { findMany: jest.fn().mockResolvedValue([g]) },
    groundParticipant: { updateMany: jest.fn().mockResolvedValue({ count: 0 }), findMany: jest.fn().mockResolvedValue([]) },
    user: { findMany: jest.fn().mockResolvedValue([{ id: LEAD, isActive: true, firstName: 'Neema', lastName: 'Mutua' }]) },
    membershipRequest: { findMany: jest.fn().mockResolvedValue([]) },
  };
  const reports = new ReportsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any);
  const svc = new GroundsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, { get: () => reports } as any);
  const [row] = (await svc.list('org1', userId, `${userId}@msingi.test`, role)) as any[];
  return row;
}
const targetsOf = (row: any) => (row.objectives ?? []).map((x: any) => `${x.ownerParticipantId ?? 'team'}:${x.target}`).sort();

const KINDS: Array<[string, any]> = [
  ['an anchor check-in', { scenario: 'HELP_TEAM_UNDERSTAND', startedFrom: 'anchor' }],
  ['an ordinary check-in', {}],
];

/* On an anchor check-in nobody who does not run it is given the lead's aims at all (decision 96, item 8), the single read included, so there the
   member's answer is none; on an ordinary one it is the team's target and her own. */
describe.each(KINDS)('targets on the check-in list, %s', (_n, over) => {
  const anchor = over.startedFrom === 'anchor';
  it('gives Amani, who checks in, the team target and her own and nobody else\'s', async () => {
    const row = await rowAs(ground(over), MEMBER, 'MEMBER');
    expect(targetsOf(row)).toEqual(anchor ? [] : ['p-amani:3', 'team:100']);
    expect(JSON.stringify(row.objectives)).not.toMatch(/p-baraka|p-joined|p-lead/);
  });
  it('gives Grace, an admin who joined it, only what a person in it reads', async () => {
    const row = await rowAs(ground(over), ADMIN_WHO_JOINED, 'ADMIN');
    expect(targetsOf(row)).toEqual(anchor ? [] : ['p-joined:5', 'team:100']);
  });
  it.each([['the lead', LEAD, 'MEMBER'], ['an admin who runs it', ADMIN_WHO_RUNS_IT, 'ADMIN'], ['an admin who is not in it', ADMIN_WHO_RUNS_IT + '-2', 'ADMIN']])('gives %s every share', async (_w, userId, role) => {
    const row = await rowAs(ground({ ...over, ...(userId === ADMIN_WHO_RUNS_IT ? { createdByUserId: ADMIN_WHO_RUNS_IT } : {}) }), userId, role);
    expect(targetsOf(row)).toEqual(['p-amani:3', 'p-baraka:4', 'p-joined:5', 'p-lead:6', 'team:100']);
  });
  it('gives Amani every share where everybody sees every target', async () => {
    const row = await rowAs(ground({ ...over, whoSeesTargets: 'EVERYBODY' }), MEMBER, 'MEMBER');
    expect(targetsOf(row)).toEqual(anchor ? [] : ['p-amani:3', 'p-baraka:4', 'p-joined:5', 'p-lead:6', 'team:100']);
  });
});
