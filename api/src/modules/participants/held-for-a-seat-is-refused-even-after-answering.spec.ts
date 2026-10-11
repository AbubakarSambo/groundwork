import { ForbiddenException } from '@nestjs/common';
import { BoardService } from '../board/board.service';
import { GroundsService } from '../grounds/grounds.service';
import { ReportsService } from '../reports/reports.service';
import { HELD_FOR_A_SEAT, refuseSomeoneHeldForASeat, theCheckInsHeldForASeat } from './held-for-a-seat';

/**
 * FINDING 7, PINNED AS IT IS (6 October 2026). Privacy row 5 (kept by decision 93) refuses EVERYBODY held for a seat the board, the
 * report and the check-in page, including somebody who has already completed a session. Whether such a person should keep reading
 * is a privacy rule only Hafsah can change, and it is asked in docs/morning-report.md under "Needs Hafsah". This pins today's
 * behaviour so it cannot move without her. The lead and an admin are never held and are never told they are.
 */
const GROUND = 'g1';
const ground = {
  id: GROUND, organizationId: 'org1', initiatorId: 'u-lead', createdByUserId: null, scenario: 'OKR_ALIGNMENT', peersVisibleToEachOther: true, cadence: 'WEEKLY',
  participants: [
    { id: 'p-lead', userId: 'u-lead', partyType: 'INITIATOR', managingOnly: true, createdAt: new Date('2026-09-01'), user: { firstName: 'Funmi', lastName: 'Eze' } },
    { id: 'p-answered', userId: 'u-answered', partyType: 'PARTICIPANT', managingOnly: false, createdAt: new Date('2026-09-02'), user: { firstName: 'Chidi', lastName: 'Okoro' } },
    { id: 'p-silent', userId: 'u-silent', partyType: 'PARTICIPANT', managingOnly: false, createdAt: new Date('2026-09-03'), user: { firstName: 'Tobi', lastName: 'Adeyemi' } },
  ],
  report: null,
};
const HELD_USERS = new Set(['u-answered', 'u-silent']);

function prismaFor() {
  const reads = { findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null), findUnique: jest.fn(async () => null), count: jest.fn(async () => 0), aggregate: jest.fn(async () => ({})) };
  const own: any = {
    groundParticipant: {
      findFirst: jest.fn(async ({ where }: any) => {
        const p = ground.participants.find((x) => x.userId === where?.userId);
        return p ? { id: p.id, awaitingSeat: HELD_USERS.has(p.userId) } : null;
      }),
      findMany: jest.fn(async ({ where }: any) => ground.participants.filter((x) => x.userId === where?.userId && HELD_USERS.has(x.userId)).map((x) => ({ id: x.id, groundId: GROUND, awaitingSeat: true }))),
    },
    checkIn: { findMany: jest.fn(async ({ where }: any) => (where?.participantId?.in ?? []).filter((id: string) => id === 'p-answered' && where.status === 'COMPLETED').map((participantId: string) => ({ participantId }))), findFirst: jest.fn(async () => null), count: jest.fn(async () => 0) },
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
];
const refused = async (read: any, userId: string) => {
  const err: any = await read(prismaFor(), userId).then(() => null, (e: any) => e);
  return err instanceof ForbiddenException && err.message === HELD_FOR_A_SEAT;
};

describe.each(reads)('held for a seat, reading %s', (_what, read) => {
  it('is refused even when they have already completed a session (row 5, until Hafsah decides)', async () => { expect(await refused(read, 'u-answered')).toBe(true); });
  it('is refused with the invitation sentence when they never answered', async () => { expect(await refused(read, 'u-silent')).toBe(true); });
  it('is never said to the lead', async () => { expect(await refused(read, 'u-lead')).toBe(false); });
  it('is never said to an admin who is not held', async () => { expect(await refused(read, 'u-admin')).toBe(false); });
});

describe('the lists', () => {
  it('leaves out the check-in for everybody held, answered or not', async () => {
    expect([...(await theCheckInsHeldForASeat(prismaFor(), [GROUND], 'u-silent'))]).toEqual([GROUND]);
    expect([...(await theCheckInsHeldForASeat(prismaFor(), [GROUND], 'u-answered'))]).toEqual([GROUND]);
  });
  it('refuses somebody held who answered', async () => {
    await expect(refuseSomeoneHeldForASeat(prismaFor(), GROUND, 'u-answered')).rejects.toThrow(HELD_FOR_A_SEAT);
  });
});
