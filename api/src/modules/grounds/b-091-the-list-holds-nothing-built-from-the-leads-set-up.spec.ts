import { GroundsService } from './grounds.service';
import { ReportsService } from '../reports/reports.service';

/**
 * B-013 AND B-091. `GET /grounds`, the check-in list, served a team member what the single read withholds: the subjects the check-in
 * will cover (their words taken from the lead's brief) and what a complete answer holds (the list answers are judged against), and
 * the opener written from the brief. Anybody who does not run the check-in reads none of them, on an anchor check-in and an ordinary one.
 * Decisions 121 and 122: an admin who runs it reads them; an admin who joined someone else's does not.
 */
const LEAD = 'user-lead';
const MEMBER = 'user-halima';
const COLLEAGUE = 'user-juma';
const ADMIN_WHO_RUNS_IT = 'user-admin';
const ADMIN_WHO_JOINED = 'user-admin-joined';

const SUBJECTS = [{ name: 'what a lost shop costs', question: 'Who is on the team?', wordsFromBrief: ['team', 'Baraka'] }];
const COMPLETE = [{ field: 'cost', why: 'it lets the reader decide if the cost is high enough to make drivers change their habits' }];
const OPENER = 'Baraka asked me to hear how orders that wait for the next run are handled.';

function ground(over: any): any {
  const p = (id: string, userId: string, first: string, last: string, partyType = 'PARTICIPANT') => ({
    id, userId, email: `${first.toLowerCase()}@msingi.test`, partyType, createdAt: new Date('2026-09-01'), managingOnly: false,
    user: { firstName: first, lastName: last, awaitingOrgApproval: false },
  });
  return {
    id: 'g1', organizationId: 'org1', initiatorId: LEAD, createdByUserId: LEAD, label: 'Help my team understand', status: 'ACTIVE',
    scenario: 'HELP_TEAM_UNDERSTAND', startedFrom: 'anchor', cadence: 'WEEKLY', timelineDays: 28, updatedAt: new Date('2026-09-20'), peersVisibleToEachOther: true,
    subjectsToCover: SUBJECTS, whatACompleteAnswerHolds: COMPLETE, openerForALink: OPENER,
    participants: [p('p-lead', LEAD, 'Baraka', 'Mutua', 'INITIATOR'), p('p-halima', MEMBER, 'Halima', 'Yusuf'), p('p-juma', COLLEAGUE, 'Juma', 'Otieno'), p('p-joined', ADMIN_WHO_JOINED, 'Grace', 'Achieng')],
    checkIns: [], report: null, reportRounds: [], reportActivations: [], dependencies: [],
    ...over,
  };
}

async function rowAs(g: any, userId: string, role: string) {
  const prisma: any = {
    ground: { findMany: jest.fn().mockResolvedValue([g]) },
    groundParticipant: { updateMany: jest.fn().mockResolvedValue({ count: 0 }), findMany: jest.fn().mockResolvedValue([]) },
    user: { findMany: jest.fn().mockResolvedValue([{ id: LEAD, isActive: true, firstName: 'Baraka', lastName: 'Mutua' }]) },
    membershipRequest: { findMany: jest.fn().mockResolvedValue([]) },
  };
  const reports = new ReportsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any);
  const svc = new GroundsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, { get: () => reports } as any);
  const [row] = (await svc.list('org1', userId, `${userId}@msingi.test`, role)) as any[];
  return row;
}

const KINDS: Array<[string, any]> = [
  ['an anchor check-in', {}],
  ['an ordinary check-in', { scenario: 'OKR_ALIGNMENT', startedFrom: null, label: 'Sales team, Q3' }],
];

describe.each(KINDS)('the check-in list on %s', (_n, over) => {
  it.each([['Halima, who checks in', MEMBER, 'MEMBER'], ['Juma, a colleague', COLLEAGUE, 'MEMBER'], ['Grace, an admin who joined it', ADMIN_WHO_JOINED, 'ADMIN']])('%s reads nothing built from the lead\'s set-up', async (_w, userId, role) => {
    const row = await rowAs(ground(over), userId, role);
    expect(row).toBeDefined();
    expect(row.subjectsToCover).toBeNull();
    expect(row.whatACompleteAnswerHolds).toBeNull();
    expect(row.openerForALink).toBeNull();
    expect(JSON.stringify(row)).not.toMatch(/lost shop|Who is on the team|high enough to make drivers|orders that wait for the next run/);
  });
  it.each([['Baraka, who leads it', LEAD, 'MEMBER'], ['an admin who runs it', ADMIN_WHO_RUNS_IT, 'ADMIN']])('%s reads all of it', async (_w, userId, role) => {
    const row = await rowAs(ground(over), userId, role);
    expect(row.subjectsToCover).toEqual(SUBJECTS);
    expect(row.whatACompleteAnswerHolds).toEqual(COMPLETE);
  });
});
