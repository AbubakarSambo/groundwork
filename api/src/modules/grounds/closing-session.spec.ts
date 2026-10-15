import { GroundsService } from './grounds.service';

/**
 * GW-CLOSING tripwires - the flagging paths.
 *   - beginClosingSession: initiator-only; flags each participant's OPEN session
 *     final, or creates a fresh final session when none is open; refuses on
 *     terminal grounds.
 *   - the flag never rewrites history: only NOT_STARTED / IN_PROGRESS rows are
 *     touched, completed sessions are never updated.
 */
function makeService(overrides: { ground?: any } = {}) {
  const ground = overrides.ground ?? {
    id: 'g1',
    status: 'ACTIVE',
    initiatorId: 'u-init',
    organizationId: 'org1',
    participants: [
      { id: 'p1', userId: 'u-init', partyType: 'INITIATOR' },
      { id: 'p2', userId: 'u-member', partyType: 'PARTICIPANT' },
      { id: 'p3', userId: null, partyType: 'PARTICIPANT' },
    ],
  };
  const prisma: any = {
    ground: { findFirst: jest.fn(async () => ground) },
    checkIn: {
      findFirst: jest.fn(async ({ where }: any) => {
        // final-session lookup: nobody has one yet
        if (where.isFinal) return null;
        if (where.status) {
          // open-session lookup: p1 has an open session, p2/p3 do not
          return where.participantId === 'p1' ? { id: 'ci-open-p1', sessionNumber: 3 } : null;
        }
        // last-session lookup
        return { sessionNumber: 4 };
      }),
      update: jest.fn(async () => ({})),
      create: jest.fn(async () => ({})),
    },
  };
  /* The loop runs inside one transaction now; the client passed in is this same mock. */
  prisma.$transaction = async (fn: any) => fn(prisma);
  const service = Object.create(GroundsService.prototype) as GroundsService;
  (service as any).prisma = prisma;
  return { service, prisma };
}

describe('GW-CLOSING: beginClosingSession', () => {
  it('flags the open session when one exists, creates a final one when none does', async () => {
    const { service, prisma } = makeService();
    const res = await service.beginClosingSession('g1', 'org1', 'u-init');

    /* Two, not three: p3 never joined (no userId) and gets no closing session to never answer. */
    expect(res.participantsFlagged).toBe(2);
    // p1's open session flagged in place - never a new row for them
    expect(prisma.checkIn.update).toHaveBeenCalledWith({ where: { id: 'ci-open-p1' }, data: { isFinal: true } });
    expect(prisma.checkIn.update).toHaveBeenCalledTimes(1);
    // p2 gets a fresh final session after their last (4 -> 5)
    expect(prisma.checkIn.create).toHaveBeenCalledTimes(1);
    for (const call of prisma.checkIn.create.mock.calls) {
      expect(call[0].data).toMatchObject({ sessionNumber: 5, status: 'NOT_STARTED', isFinal: true });
    }
  });

  it('refuses anyone but the initiator', async () => {
    const { service } = makeService();
    await expect(service.beginClosingSession('g1', 'org1', 'u-member')).rejects.toThrow('Only the person who runs this check-in');
  });

  it('refuses terminal grounds', async () => {
    const { service } = makeService({
      ground: { id: 'g1', status: 'RESOLVED', initiatorId: 'u-init', organizationId: 'org1', participants: [] },
    });
    await expect(service.beginClosingSession('g1', 'org1', 'u-init')).rejects.toThrow('already ended');
  });
});
