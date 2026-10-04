import { WhatNeedsYouService } from './what-needs-you.service';
import { YourBoardService } from './your-board.service';
import { GroundsService } from './grounds.service';
import { ReportsService } from '../reports/reports.service';

/**
 * NOBODY HELD FOR A SEAT READS THE CHECK-IN ON TODAY, ON YOU OR ON THE LIST (privacy row 5, kept by decision 93; second review, new leak A).
 *
 * Today checked only whether the person was waiting for the organisation's approval, so somebody held for a seat on "Sahar handing
 * finance to Amina" read "The report for Sahar handing finance to Amina is ready", its summary and a "Read it" card, which the report
 * then refused. You listed the same check-in with its goals. Read through the real services, as the person held and as a person who
 * has a seat.
 */
const ORG = 'org1';
const HELD = 'u-held';
const IN = 'u-in';
const SUMMARY = 'All three people agree that the finance role is being handed over from Sahar Bello to you, who is new to the work.';

const p = (id: string, userId: string, first: string, last: string, partyType = 'PARTICIPANT') => ({
  id, userId, email: `${first.toLowerCase()}@x.test`, partyType, createdAt: new Date('2026-09-01'), managingOnly: false, awaitingSeat: userId === HELD,
  user: { firstName: first, lastName: last, awaitingOrgApproval: false },
});
const done = (id: string, pid: string) => ({ id, participantId: pid, sessionNumber: 1, status: 'COMPLETED', isSetup: false, createdAt: new Date('2026-09-21'), completedAt: new Date('2026-09-23'), availableFrom: new Date('2026-09-21') });
const ground = () => ({
  id: 'g1', organizationId: ORG, initiatorId: 'u-lead', createdByUserId: null, label: 'Sahar handing finance to Amina', status: 'ACTIVE', scenario: 'OKR_ALIGNMENT',
  cadence: 'WEEKLY', timelineDays: 84, updatedAt: new Date('2026-09-20'), peersVisibleToEachOther: true,
  participants: [p('p-lead', 'u-lead', 'Sahar', 'Bello', 'INITIATOR'), p('p-in', IN, 'Chidi', 'Okoro'), p('p-held', HELD, 'Tobi', 'Adeyemi')],
  checkIns: [done('c1', 'p-lead'), done('c2', 'p-in'), { ...done('c3', 'p-held'), status: 'NOT_STARTED', completedAt: null }],
  report: { releasedAt: new Date('2026-09-23'), releasedSessions: [1], agreements: [], divergences: [], sharedAs: null }, reportRounds: [{ sessionNumber: 1, finding: null, sharedPicture: SUMMARY }],
  reportActivations: [], dependencies: [], objectives: [],
});

const prismaFor = (list: any[] = []) => withTheRest({
  ground: { findMany: jest.fn(async () => list) },
  groundParticipant: {
    findMany: jest.fn(async ({ where }: any) => {
      const rows = [{ groundId: 'g1', userId: HELD, awaitingSeat: true }, { groundId: 'g1', userId: IN, awaitingSeat: false }];
      return rows.filter((r) => (!where?.userId || r.userId === where.userId) && (where?.awaitingSeat === undefined || r.awaitingSeat === where.awaitingSeat));
    }),
    updateMany: jest.fn(async () => ({ count: 0 })),
  },
  organizationMembership: { findMany: jest.fn(async () => []) },
  user: { findUnique: jest.fn(async () => ({ awaitingOrgApproval: false })), findMany: jest.fn(async () => []) },
  membershipRequest: { findMany: jest.fn(async () => []) },
  personObjective: { findMany: jest.fn(async () => []) },
  person: { findFirst: jest.fn(async () => null), findMany: jest.fn(async () => []) },
}) as any;

const withTheRest = (own: any) => new Proxy(own, {
  get(target: any, prop: string) {
    if (!(prop in target) && typeof prop === 'string' && !prop.startsWith('$') && prop !== 'then') {
      target[prop] = { findMany: async () => [], findFirst: async () => null, findUnique: async () => null, count: async () => 0, aggregate: async () => ({}) };
    }
    return target[prop];
  },
});

const realList = (prisma: any) => {
  const reports = new ReportsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any);
  const grounds: any = new GroundsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, { get: () => reports } as any);
  return grounds;
};
const listRow = (g: any) => ({ ...g, latestSummary: SUMMARY, latestFinding: null, reportWaitingForMe: true, glance: { progress: { roundsDone: 1, roundsPlanned: 12, answeredThisRound: 2, ofPeople: 3, waitingOn: [], openRound: 2 } } });

describe('a person held for a seat, on the list, on Today and on You', () => {
  it('the check-in list leaves the check-in out for the person held, and keeps it for the person with a seat', async () => {
    const prisma = prismaFor([ground()]);
    const held: any[] = await realList(prisma).list(ORG, HELD, 'tobi@x.test', 'MEMBER');
    expect(JSON.stringify(held)).not.toContain('Sahar handing finance to Amina');
    const inIt: any[] = await realList(prismaFor([ground()])).list(ORG, IN, 'chidi@x.test', 'MEMBER');
    expect(inIt.map((g) => g.id)).toContain('g1');
  });

  it('Today says nothing of the check-in to the person held, however the list is built', async () => {
    const prisma: any = prismaFor();
    const grounds: any = { list: jest.fn(async () => [listRow(ground())]), listAwaitingApproval: jest.fn(async () => []) };
    const svc = new WhatNeedsYouService(prisma, grounds);
    const held = JSON.stringify(await svc.forReader(HELD, 'tobi@x.test', ORG, 'MEMBER'));
    expect(held).not.toContain('Sahar handing finance to Amina');
    expect(held).not.toContain('Read it');
    expect(held).not.toContain(SUMMARY);
  });

  it('Today still tells the person with a seat that the report is ready', async () => {
    const prisma: any = prismaFor();
    const grounds: any = { list: jest.fn(async () => [listRow(ground())]), listAwaitingApproval: jest.fn(async () => []) };
    const inIt = JSON.stringify(await new WhatNeedsYouService(prisma, grounds).forReader(IN, 'chidi@x.test', ORG, 'MEMBER'));
    expect(inIt).toContain('Sahar handing finance to Amina');
  });

  it('You lists nothing of the check-in for the person held', async () => {
    const prisma: any = prismaFor();
    const grounds: any = { list: jest.fn(async () => [listRow(ground())]) };
    const held = JSON.stringify(await new YourBoardService(prisma, grounds).forReader({ userId: HELD, email: 'tobi@x.test', organizationId: ORG, role: 'MEMBER' }, null));
    expect(held).not.toContain('Sahar handing finance to Amina');
    expect(held).not.toContain(SUMMARY);
    const inIt = JSON.stringify(await new YourBoardService(prisma, grounds).forReader({ userId: IN, email: 'chidi@x.test', organizationId: ORG, role: 'MEMBER' }, null));
    expect(inIt).toContain('Sahar handing finance to Amina');
  });
});
