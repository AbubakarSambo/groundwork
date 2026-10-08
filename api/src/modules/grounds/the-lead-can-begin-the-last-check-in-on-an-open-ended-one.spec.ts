import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { GroundsService } from './grounds.service';

/**
 * S1 (nothing-removed audit): "BEGIN THE LAST CHECK-IN" WORKS WHENEVER THE CHECK-IN IS RUNNING, AN OPEN-ENDED ONE INCLUDED.
 *
 * Live let the lead press it at any time. The screens drew it only near a planned end, so on a check-in that runs until the lead
 * ends it nobody could. The server never needed a planned end and must not start to: the lead begins the last check-in for the people who
 * took part, whatever the length, and a closing session is never made twice. Read as the lead, a member and somebody from another
 * organisation are served it.
 */
const ground = (more: Record<string, unknown> = {}) => ({
  id: 'g1', status: 'ACTIVE', initiatorId: 'u-lead', organizationId: 'org1', runsUntilEnded: true, timelineDays: 365, cadence: 'WEEKLY',
  participants: [
    { id: 'p1', userId: 'u-lead', partyType: 'INITIATOR', managingOnly: true },
    { id: 'p2', userId: 'u-amani', partyType: 'PARTICIPANT' },
    { id: 'p3', userId: 'u-pia', partyType: 'PARTICIPANT' },
    { id: 'p4', userId: null, partyType: 'PARTICIPANT' },
  ],
  ...more,
});

function world(g: any) {
  const sessions: any[] = [
    { id: 'c-amani-9', participantId: 'p2', sessionNumber: 9, status: 'IN_PROGRESS', isFinal: false },
    { id: 'c-pia-8', participantId: 'p3', sessionNumber: 8, status: 'COMPLETED', isFinal: false },
  ];
  const prisma: any = {
    ground: { findFirst: jest.fn(async ({ where }: any) => (where.organizationId === g.organizationId && where.id === g.id ? g : null)) },
    checkIn: {
      findFirst: jest.fn(async ({ where, orderBy }: any) => {
        let rows = sessions.filter((s) => s.participantId === where.participantId);
        if (where.isFinal) rows = rows.filter((s) => s.isFinal);
        if (where.status?.in) rows = rows.filter((s) => where.status.in.includes(s.status));
        rows = [...rows].sort((a, b) => (orderBy?.sessionNumber === 'desc' ? b.sessionNumber - a.sessionNumber : a.sessionNumber - b.sessionNumber));
        return rows[0] ?? null;
      }),
      update: jest.fn(async ({ where, data }: any) => Object.assign(sessions.find((s) => s.id === where.id), data)),
      create: jest.fn(async ({ data }: any) => { sessions.push({ id: `c-new-${sessions.length}`, ...data }); return data; }),
    },
  };
  prisma.$transaction = async (fn: any) => fn(prisma);
  const service = Object.create(GroundsService.prototype) as GroundsService;
  (service as any).prisma = prisma;
  return { service, sessions };
}

describe('the lead begins the last check-in on one that runs until she ends it', () => {
  it('flags the open session of one person and gives the other a final one after their last, and leaves out whoever never joined', async () => {
    const w = world(ground());
    const res = await w.service.beginClosingSession('g1', 'org1', 'u-lead');
    expect(res).toEqual({ groundId: 'g1', closingSession: true, participantsFlagged: 2 });
    expect(w.sessions.find((s) => s.id === 'c-amani-9')).toMatchObject({ isFinal: true, status: 'IN_PROGRESS' });
    expect(w.sessions.find((s) => s.id === 'c-pia-8')).toMatchObject({ isFinal: false, status: 'COMPLETED' });
    expect(w.sessions.filter((s) => s.participantId === 'p3' && s.isFinal)).toEqual([expect.objectContaining({ sessionNumber: 9, status: 'NOT_STARTED' })]);
  });

  it('pressing it twice is pressing it once', async () => {
    const w = world(ground());
    await w.service.beginClosingSession('g1', 'org1', 'u-lead');
    const before = w.sessions.length;
    const again = await w.service.beginClosingSession('g1', 'org1', 'u-lead');
    expect(again.participantsFlagged).toBe(2);
    expect(w.sessions).toHaveLength(before);
  });

  it('is the same for one with a planned end and one with no plan at all', async () => {
    const planned = world(ground({ runsUntilEnded: false, timelineDays: 90 }));
    const open = world(ground());
    expect((await planned.service.beginClosingSession('g1', 'org1', 'u-lead')).participantsFlagged).toBe((await open.service.beginClosingSession('g1', 'org1', 'u-lead')).participantsFlagged);
  });
});

describe('who is refused, in a sentence that says what to do', () => {
  it('a member who is not the lead', async () => {
    const w = world(ground());
    await expect(w.service.beginClosingSession('g1', 'org1', 'u-amani')).rejects.toThrow(ForbiddenException);
    expect(w.sessions.some((s) => s.isFinal)).toBe(false);
  });
  it('somebody from another organisation is told it is not there', async () => {
    const w = world(ground());
    await expect(w.service.beginClosingSession('g1', 'other-org', 'u-lead')).rejects.toThrow(NotFoundException);
  });
  it('a check-in that has already ended', async () => {
    const w = world(ground({ status: 'RESOLVED' }));
    await expect(w.service.beginClosingSession('g1', 'org1', 'u-lead')).rejects.toThrow(BadRequestException);
  });
});
