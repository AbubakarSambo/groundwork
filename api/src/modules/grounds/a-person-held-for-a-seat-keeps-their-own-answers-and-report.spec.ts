import { WhatNeedsYouService } from './what-needs-you.service';
import { YourBoardService } from './your-board.service';
import { GroundsService } from './grounds.service';
import { ReportsService } from '../reports/reports.service';
import { ForbiddenException } from '@nestjs/common';
import { ConversationService } from '../conversation/conversation.service';
import { HELD_FOR_A_SEAT } from '../participants/held-for-a-seat';

/**
 * A PERSON HELD FOR A SEAT KEEPS THEIR OWN ANSWERS AND THEIR OWN REPORT, AND NOTHING ELSE; THE LIMIT STOPS ONLY NEW PARTICIPATION
 * (decision 110, B3; privacy row 5 and finding 7).
 *
 * Tobi answered session 1 and was then held for a seat. Read as Tobi: the You page names his own report (and only that: no goal, no card, no
 * colleague, no shared report); Tobi who never answered is given nothing of the check-in; the lead is unchanged. Opening or answering a new
 * session is refused for Tobi, and his own transcript and his own session report (the routes that read what he already said) are not.
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


describe('Tobi answered, and is held for a seat', () => {
  const answeredByTobi = () => {
    const g = ground();
    g.checkIns = [done('c1', 'p-lead'), done('c2', 'p-in'), done('c3', 'p-held')];
    return g;
  };
  const prismaWithHisReport = () => {
    const prisma: any = prismaFor();
    prisma.checkIn = { findMany: jest.fn(async ({ where }: any) => (where?.participant?.userId === HELD && where?.participant?.awaitingSeat === true
      ? [{ id: 'c3', groundId: 'g1', completedAt: new Date('2026-09-23'), ground: { label: 'Sahar handing finance to Amina' } }]
      : [])), findFirst: async () => null, findUnique: async () => null, count: async () => 0 };
    return prisma;
  };
  const youAs = async (userId: string, email: string, prisma: any = prismaWithHisReport()) => {
    const grounds: any = { list: jest.fn(async () => [listRow(answeredByTobi())]) };
    return new YourBoardService(prisma, grounds).forReader({ userId, email, organizationId: ORG, role: 'MEMBER' }, null) as Promise<any>;
  };

  it('his You page names his own report, and links to it', async () => {
    const board = await youAs(HELD, 'tobi@x.test');
    expect(board.ownReports).toEqual([{ checkIn: 'Sahar handing finance to Amina', at: '2026-09-23T00:00:00.000Z', to: '/checkin/c3/report' }]);
  });

  it('and nothing else of the check-in: no goal, no card, no colleague, no shared report', async () => {
    const board = await youAs(HELD, 'tobi@x.test');
    expect(board.checkIns).toEqual([]);
    const wire = JSON.stringify({ ...board, ownReports: undefined });
    expect(wire).not.toContain('Sahar handing finance to Amina');
    expect(wire).not.toContain(SUMMARY);
    expect(wire).not.toMatch(/Chidi|Okoro|Sahar/);
  });

  it('Chidi, who has a seat, reads his own as before, and not Tobi\'s report', async () => {
    const board = await youAs(IN, 'chidi@x.test');
    expect(board.ownReports.map((r: any) => r.to)).toEqual(['/checkin/c2/report']);
  });
});

describe('Tobi never answered, and is held for a seat', () => {
  it('his You page has no report and nothing of the check-in', async () => {
    const prisma: any = prismaFor();
    prisma.checkIn = { findMany: jest.fn(async () => []), findFirst: async () => null, findUnique: async () => null, count: async () => 0 };
    const grounds: any = { list: jest.fn(async () => [listRow(ground())]) };
    const board: any = await new YourBoardService(prisma, grounds).forReader({ userId: HELD, email: 'tobi@x.test', organizationId: ORG, role: 'MEMBER' }, null);
    expect(board.ownReports).toEqual([]);
    expect(JSON.stringify(board)).not.toContain('Sahar handing finance to Amina');
  });
});

describe('the seat limit stops new participation only', () => {
  const service = (awaitingSeat: boolean, status = 'NOT_STARTED') => {
    const nothing: any = { get: () => undefined, emit: jest.fn(() => Promise.resolve()) };
    const prisma: any = { checkIn: { findMany: jest.fn(async () => []), findUnique: jest.fn(async () => ({ id: 'c3', groundId: 'g1', participantId: 'p-held', sessionNumber: 2, status, isSelfCorrection: false, participant: { userId: HELD, awaitingSeat, user: { awaitingOrgApproval: false } } })) } };
    return new ConversationService(prisma, {} as any, { extract: jest.fn() } as any, {} as any, nothing, nothing, nothing, nothing, nothing, nothing) as any;
  };

  it('opening a new session, or answering one, is refused for somebody held, with the sentence the invitation page gives', async () => {
    await expect(service(true).open('c3', HELD)).rejects.toThrow(new ForbiddenException(HELD_FOR_A_SEAT));
    await expect(service(true).sendMessage('c3', HELD, 'Hello')).rejects.toThrow(new ForbiddenException(HELD_FOR_A_SEAT));
  });

  it('and not for somebody with a seat: the same call gets past that door', async () => {
    const svc = service(false);
    svc.assertGroundAcceptsInput = jest.fn(async () => { throw new Error('past the seat door'); });
    await expect(svc.open('c3', HELD)).rejects.toThrow('past the seat door');
  });

  it('what he already said is still his to read: his own transcript is not refused for a seat', async () => {
    const svc = service(true, 'COMPLETED');
    svc.briefFor = () => null; svc.whoIsReadingIt = () => 'participant'; svc.connectWhatsAppOn = async () => null; svc.untoldGoalsOn = async () => [];
    svc.prisma.conversationTurn = { findMany: async () => [] };
    svc.prisma.ground = { findUnique: async () => ({ id: 'g1', label: 'x', scenario: 'NEW_PROJECT' }) };
    await expect(svc.getTranscript('c3', HELD)).resolves.toBeDefined();
  });
});
