import { ForbiddenException } from '@nestjs/common';
import { BoardService } from '../board/board.service';
import { GroundsService } from '../grounds/grounds.service';
import { ReportsService } from '../reports/reports.service';
import { TheWeeklyReportService } from '../reports/the-weekly-report.service';
import { CANNOT_CHECK_IN_YET, CANNOT_READ_THE_REPORT_YET, CANNOT_OPEN_THE_BOARD_YET } from './nobody-joins-your-company-by-being-invited-to-a-check-in';

/**
 * ROW 5, KEPT BY DECISION 93: somebody waiting for the organisation's approval is not yet let into it, so the check-in page and the weekly report refuse them too, as the board and the reports already did.
 *
 * Someone held for a seat, who had a sign-in, read the board, every report and a colleague's words: only the invitation page
 * and the people waiting for the organisation's approval were turned away. Every read of a check-in now refuses them first,
 * with the one sentence the invitation page already gives. Read through the real services, as the person held and as a
 * person who is not held (who must not be told they are).
 */
const GROUND = 'g1';
const HELD = 'u-waiting';
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
        return p ? { id: p.id, awaitingSeat: false } : null;
      }),
      findMany: async () => [],
    },
    user: { findUnique: jest.fn(async ({ where }: any) => ({ role: 'MEMBER', organizationId: 'org1', awaitingOrgApproval: where?.id === HELD })) },
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

const reads: [string, string, (p: any, userId: string) => Promise<unknown>][] = [
  ['the board', CANNOT_OPEN_THE_BOARD_YET, (p, u) => new BoardService(p, { respond: async () => null } as any, { getSessionProgress: async () => null } as any, reports(p)).get(GROUND, u)],
  ['the check-in page', CANNOT_CHECK_IN_YET, (p, u) => new GroundsService(p, {} as any, {} as any, {} as any, {} as any, {} as any, { respond: async () => '' } as any).get(GROUND, 'org1', u)],
  ['the report', CANNOT_READ_THE_REPORT_YET, (p, u) => reports(p).get(GROUND, u, 'org1')],
  ['the weekly report', CANNOT_READ_THE_REPORT_YET, (p, u) => new TheWeeklyReportService(p).read(GROUND, { userId: u, role: 'MEMBER', organizationId: 'org1' }, new Date(), null)],
];

describe.each(reads)('someone waiting for the organisation, reading %s', (_what, sentence, read) => {
  it('is refused in a plain sentence and reads nothing else', async () => {
    const err: any = await read(prismaFor(), HELD).then(() => null, (e) => e);
    expect(err).toBeInstanceOf(ForbiddenException);
    expect(err.message).toBe(sentence);
  });

  it('a person who is let in is never given that sentence', async () => {
    const err: any = await read(prismaFor(), IN).then(() => null, (e) => e);
    expect(String(err?.message ?? '')).not.toBe(sentence);
  });
});
