import { ForbiddenException } from '@nestjs/common';
import { GroundMode, GroundScenario } from '@prisma/client';
import { ReportsService } from './reports.service';
import { BoardService } from '../board/board.service';
import {
  CANNOT_READ_THE_REPORT_YET,
  CANNOT_OPEN_THE_BOARD_YET,
} from '../participants/nobody-joins-your-company-by-being-invited-to-a-check-in';

/**
 * REQUEST 49: SOMEBODY HELD FOR A SEAT READS NO REPORT.
 *
 * Faraji joined a check-in through an open link while no seat was free. His account and his
 * participant row exist, but he is `awaitingOrgApproval`: waiting for an admin to let him into the
 * organisation. The check-in already refused him. `GET /grounds/:id/report` served him the released
 * team report with 200, every name in it.
 *
 * The decision (the more private one): nothing of a check-in's report reaches him - the team report,
 * any session's report, the rounds, what success was said to be, who has shown theirs, the board and
 * its names - until an admin lets him in. These tests read what each route actually hands him, and
 * then read the same routes once he is let in, so a gate that refused everybody would fail too.
 */

const RELEASED = {
  id: 'r1',
  groundId: 'g1',
  createdAt: new Date(),
  releasedAt: new Date(),
  sharedPicture: 'Rukia and Faraji both describe the stock count as late.',
  agreements: [],
  divergences: [],
  centralQuestion: 'Who owns the stock count?',
  engagement: {},
  finalSynthesis: { tiers: {} },
};

function reportsFor(held: boolean) {
  const ground = {
    id: 'g1',
    scenario: 'NEW_PROJECT',
    initiatorId: 'lead-user',
    organizationId: 'org1',
    status: 'ACTIVE',
    resolutionState: null,
    peersVisibleToEachOther: true,
    participants: [
      { id: 'p-lead', userId: 'lead-user', partyType: 'INITIATOR', user: { firstName: 'Rukia', lastName: 'Otieno', email: 'r@x.test' } },
      { id: 'p-held', userId: 'faraji', partyType: 'PARTICIPANT', user: { firstName: 'Faraji', lastName: 'Mwangi', email: 'f@x.test' } },
    ],
    report: RELEASED,
    objectives: [],
  };
  const prisma: any = {
    groundBaseline: { findFirst: jest.fn(async () => null) },
    groundBaselineEntry: { findMany: jest.fn(async () => []) },
    personObjective: { findMany: jest.fn(async () => []) },
    ground: { findUnique: jest.fn(async () => ground) },
    user: {
      findUnique: jest.fn(async ({ where }: any) => ({
        role: where.id === 'lead-user' ? 'ADMIN' : 'MEMBER',
        organizationId: 'org1',
        awaitingOrgApproval: where.id === 'faraji' ? held : false,
      })),
    },
    reportActivation: { findUnique: jest.fn(async () => ({ status: 'ACTIVATED' })), findMany: jest.fn(async () => []), upsert: jest.fn(async () => ({})) },
    reportRound: { findMany: jest.fn(async () => [{ sessionNumber: 1, sharedPicture: RELEASED.sharedPicture, agreements: [], divergences: [], centralQuestion: 'x', takenAt: new Date() }]) },
    recordEntry: { findMany: jest.fn(async () => []) },
    groundDocument: { findMany: jest.fn(async () => []) },
    checkIn: { findMany: jest.fn(async () => []), aggregate: jest.fn(async () => ({ _max: { sessionNumber: 1 } })) },
    deferral: { findMany: jest.fn(async () => []) },
  };
  const config: any = { get: jest.fn(() => false) };
  const grounds: any = { getSessionProgress: jest.fn(async () => null) };
  return new ReportsService(prisma, {} as any, {} as any, {} as any, config, {} as any, grounds, { tell: async () => [] } as any);
}

function boardFor(held: boolean) {
  /* findFirst: the board reads the lead's first check-in for "Your full report is ready in a moment" (3 November 2026). */
  const none = { findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null), count: jest.fn(async () => 0) };
  const ground = {
    id: 'g1', scenario: GroundScenario.NEW_PROJECT, mode: GroundMode.SHARED, organizationId: 'org1',
    initiatorId: 'lead-user', createdByUserId: null, peopleWorkTogether: true, timelineDays: 90,
    cadence: 'WEEKLY', moment: 'STARTING', peersVisibleToEachOther: true,
    participants: [
      { id: 'p-lead', userId: 'lead-user', user: { firstName: 'Rukia', lastName: 'Otieno' } },
      { id: 'p-held', userId: 'faraji', user: { firstName: 'Faraji', lastName: 'Mwangi' } },
    ],
    checkIns: [], report: RELEASED, objectives: [], dependencies: [], poll: null,
  };
  const prisma: any = {
    ground: { findUnique: jest.fn(async () => ground) },
    user: { findUnique: jest.fn(async ({ where }: any) => ({ role: 'MEMBER', organizationId: 'org1', awaitingOrgApproval: where.id === 'faraji' ? held : false })) },
    recordEntry: none, workMention: none, checkIn: none, groundDependency: none, patternDetection: none,
    groundObjective: none, groundObjectiveSnapshot: none, groundParticipant: none,
  };
  return new BoardService(prisma, { respond: async () => null } as any, { getSessionProgress: async () => null } as any,
    { theReportAsItWasShared: (g: any) => g?.report ?? null } as any);
}

async function whatHeIsServed(p: Promise<unknown>) {
  try {
    return { served: JSON.stringify(await p), refused: null as any };
  } catch (e) {
    return { served: null, refused: e };
  }
}

describe('Faraji, held for a seat, on every report route', () => {
  const routes: Array<[string, (s: ReportsService) => Promise<unknown>]> = [
    ['the team report', (s) => s.get('g1', 'faraji', 'org1')],
    ["a session's report", (s) => s.sessionReport('g1', 1, 'faraji', 'org1')],
    ['what the report said each round', (s) => s.rounds('g1', 'faraji', 'org1')],
    ['what success was said to be', (s) => s.whereAgainstSuccess('g1', 'faraji', 'org1')],
    ['who has shown theirs', (s) => s.getActivationStatusForUser('g1', 'faraji')],
    ['showing his own', (s) => s.activate('g1', 'faraji')],
  ];

  it.each(routes)('%s is refused, with the plain sentence and no name in it', async (_label, call) => {
    const { served, refused } = await whatHeIsServed(call(reportsFor(true)));
    expect(served).toBeNull();
    expect(refused).toBeInstanceOf(ForbiddenException);
    expect(refused.message).toBe(CANNOT_READ_THE_REPORT_YET);
    expect(refused.message).not.toMatch(/Rukia|Faraji|stock count/);
  });

  it('reads: "You can read this check-in\'s report once an admin at the organisation that invited you approves you joining it."', () => {
    expect(CANNOT_READ_THE_REPORT_YET).toBe(
      "You can read this check-in's report once an admin at the organisation that invited you approves you joining it.",
    );
  });

  it('the board, which carries the report\'s story and every name, is refused too', async () => {
    const { served, refused } = await whatHeIsServed(boardFor(true).get('g1', 'faraji'));
    expect(served).toBeNull();
    expect(refused).toBeInstanceOf(ForbiddenException);
    expect(refused.message).toBe(CANNOT_OPEN_THE_BOARD_YET);
  });
});

describe('once an admin lets him in', () => {
  it('the team report reaches him, with the picture in it', async () => {
    const { served, refused } = await whatHeIsServed(reportsFor(false).get('g1', 'faraji', 'org1'));
    expect(refused).toBeNull();
    expect(served).toContain('stock count as late');
  });

  it('and the board opens', async () => {
    const { refused } = await whatHeIsServed(boardFor(false).get('g1', 'faraji'));
    expect(refused).toBeNull();
  });
});

describe('the lead is untouched', () => {
  it('Rukia reads her report and her board as before', async () => {
    const report = await whatHeIsServed(reportsFor(true).get('g1', 'lead-user', 'org1'));
    expect(report.refused).toBeNull();
    expect(report.served).toContain('stock count as late');
    const board = await whatHeIsServed(boardFor(true).get('g1', 'lead-user'));
    expect(board.refused).toBeNull();
  });
});
