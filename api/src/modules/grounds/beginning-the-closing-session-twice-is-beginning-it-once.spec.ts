import { GroundsService } from './grounds.service';

/**
 * BEGINNING THE CLOSING SESSION TWICE IS BEGINNING IT ONCE.
 *
 * Each pass computed `last + 1` and created, so a retry gave every person a second final session
 * one number on, and the unique index could not catch it because the number had moved. And it
 * looped over every participant row, so a managing-only lead and an invitee who never joined each
 * got a closing session they would never answer - which held the closing round open for ever.
 *
 * One transaction, one final session per answering party, none for anybody else.
 */
function makeService(finalsAlready: Record<string, boolean> = {}) {
  const ground = {
    id: 'g1', status: 'ACTIVE', initiatorId: 'u-init', organizationId: 'org1',
    participants: [
      { id: 'lead', userId: 'u-init', partyType: 'INITIATOR', managingOnly: false },
      { id: 'member', userId: 'u-member', partyType: 'PARTICIPANT', managingOnly: false },
      { id: 'manager-only', userId: 'u-mgr', partyType: 'INITIATOR', managingOnly: true },
      { id: 'never-joined', userId: null, partyType: 'PARTICIPANT', managingOnly: false },
    ],
  };
  const created: any[] = [];
  const prisma: any = {
    ground: { findFirst: jest.fn(async () => ground) },
    checkIn: {
      findFirst: jest.fn(async ({ where }: any) => {
        if (where.isFinal) return finalsAlready[where.participantId] || created.some((c) => c.participantId === where.participantId) ? { id: 'final' } : null;
        if (where.status) return null;
        return { sessionNumber: 4 };
      }),
      update: jest.fn(async () => ({})),
      create: jest.fn(async (a: any) => { created.push(a.data); return a.data; }),
    },
  };
  prisma.$transaction = async (fn: any) => fn(prisma);
  const service = Object.create(GroundsService.prototype) as GroundsService;
  (service as any).prisma = prisma;
  return { service, prisma, created };
}

describe('beginning the closing session', () => {
  it('gives one final session to each answering party, and none to a managing-only lead or somebody who never joined', async () => {
    const { service, created } = makeService();
    const res = await service.beginClosingSession('g1', 'org1', 'u-init');
    expect(res.participantsFlagged).toBe(2);
    expect(created.map((c) => c.participantId).sort()).toEqual(['lead', 'member']);
    for (const c of created) expect(c).toMatchObject({ sessionNumber: 5, isFinal: true });
  });

  it('a second call creates nothing more', async () => {
    const { service, created } = makeService();
    await service.beginClosingSession('g1', 'org1', 'u-init');
    const again = await service.beginClosingSession('g1', 'org1', 'u-init');
    expect(again.participantsFlagged).toBe(2);
    expect(created).toHaveLength(2);
  });

  it('runs inside one transaction', async () => {
    const { service, prisma } = makeService();
    prisma.$transaction = jest.fn(async (fn: any) => fn(prisma));
    await service.beginClosingSession('g1', 'org1', 'u-init');
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });
});
