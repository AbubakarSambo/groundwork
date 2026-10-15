import { ForbiddenException } from '@nestjs/common';
import { BoardService } from '../board/board.service';
import { GroundsService } from '../grounds/grounds.service';
import { ReportsService } from '../reports/reports.service';
import { TheWeeklyReportService } from '../reports/the-weekly-report.service';
import { HELD_FOR_A_SEAT } from './held-for-a-seat';

/**
 * PRIVACY SWEEP 5 OCTOBER 2026, FINDING 3 (privacy row 5, kept by decision 93; request 49).
 *
 * Someone held for a seat, who had a sign-in, read the board, every report and a colleague's words: only the invitation page
 * and the people waiting for the organisation's approval were turned away. Every read of a check-in now refuses them first,
 * with the one sentence the invitation page already gives. Read through the real services, as the person held and as a
 * person who is not held (who must not be told they are).
 */
const GROUND = 'g1';
const HELD = 'u-held';
const IN = 'u-in';

const ground = {
  id: GROUND, organizationId: 'org1', initiatorId: 'u-lead', createdByUserId: null, scenario: 'OKR_ALIGNMENT', peersVisibleToEachOther: true, cadence: 'WEEKLY',
  participants: [
    { id: 'p-lead', userId: 'u-lead', partyType: 'INITIATOR', managingOnly: true, createdAt: new Date('2026-09-01'), user: { firstName: 'Funmi', lastName: 'Eze' } },
    { id: 'p-in', userId: IN, partyType: 'PARTICIPANT', managingOnly: false, createdAt: new Date('2026-09-02'), user: { firstName: 'Chidi', lastName: 'Okoro' } },
    { id: 'p-held', userId: HELD, partyType: 'PARTICIPANT', managingOnly: false, createdAt: new Date('2026-09-03'), user: { firstName: 'Tobi', lastName: 'Adeyemi' } },
  ],
  report: null,
};

function prismaFor() {
  const reads = { findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null), findUnique: jest.fn(async () => null), count: jest.fn(async () => 0), aggregate: jest.fn(async () => ({})) };
  const own: any = {
    groundParticipant: {
      findFirst: jest.fn(async ({ where }: any) => {
        const p = ground.participants.find((x) => x.userId === where?.userId);
        return p ? { id: p.id, awaitingSeat: p.userId === HELD } : null;
      }),
      findMany: async () => [],
    },
    user: { findUnique: jest.fn(async () => ({ role: 'MEMBER', organizationId: 'org1', awaitingOrgApproval: false })) },
    ground: { findUnique: jest.fn(async () => ground), findFirst: jest.fn(async () => ground) },
  };
  return new Proxy(own, {
    get(target: any, prop: string) {
      if (!(prop in target) && typeof prop === 'string' && !prop.startsWith('$') && prop !== 'then') target[prop] = { ...reads };
      return target[prop];
    },
  });
}

const reports = (prisma: any) => new ReportsService(prisma, {} as any, {} as any, {} as any, { get: () => 'http://localhost' } as any, { emit: () => Promise.resolve() } as any, { getSessionProgress: async () => null } as any, { tell: async () => [] } as any);

const reads: [string, (p: any, userId: string) => Promise<unknown>][] = [
  ['the board', (p, u) => new BoardService(p, { respond: async () => null } as any, { getSessionProgress: async () => null } as any, reports(p)).get(GROUND, u)],
  ['the check-in page', (p, u) => new GroundsService(p, {} as any, {} as any, {} as any, {} as any, {} as any, { respond: async () => '' } as any).get(GROUND, 'org1', u)],
  ['the report', (p, u) => reports(p).get(GROUND, u, 'org1')],
  ['the session report', (p, u) => reports(p).sessionReport(GROUND, 1, u, 'org1')],
  ['the rounds', (p, u) => reports(p).rounds(GROUND, u, 'org1')],
  ['where things stand against success', (p, u) => reports(p).whereAgainstSuccess(GROUND, u, 'org1')],
  ['the weekly report', (p, u) => new TheWeeklyReportService(p).read(GROUND, { userId: u, role: 'MEMBER', organizationId: 'org1' }, new Date(), null)],
];

describe.each(reads)('someone held for a seat, reading %s', (_what, read) => {
  it('is refused with the sentence the invitation page gives, and reads nothing else', async () => {
    const err: any = await read(prismaFor(), HELD).then(() => null, (e) => e);
    expect(err).toBeInstanceOf(ForbiddenException);
    expect(err.message).toBe(HELD_FOR_A_SEAT);
  });

  it('a person who is not held is never given that sentence', async () => {
    const err: any = await read(prismaFor(), IN).then(() => null, (e) => e);
    expect(String(err?.message ?? '')).not.toBe(HELD_FOR_A_SEAT);
  });
});
