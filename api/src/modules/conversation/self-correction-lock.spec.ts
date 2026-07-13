import { ConversationService } from './conversation.service';
import { BadRequestException } from '@nestjs/common';

/**
 * GW-SELFCORRECT-LOCK tripwire.
 *
 * The model: a participant can self-correct a past session UP UNTIL their next
 * session opens. Once a later session has started, it is already building on the
 * one being corrected, so correcting the source now would leave the sessions that
 * followed inconsistent - the correction is blocked.
 *
 * The "after" test is the real tripwire: if the lock in startSelfCorrectionSession
 * is removed, that test goes red (the correction is created instead of blocked).
 */
function makeService(laterStartedRow: any) {
  const prisma: any = {
    groundParticipant: { findFirst: jest.fn(async () => ({ id: 'p1', groundId: 'g1' })) },
    checkIn: {
      // the target session being corrected - completed
      findUnique: jest.fn(async () => ({ id: 'ci-target', status: 'COMPLETED', sessionNumber: 1 })),
      findFirst: jest.fn(async (args: any) => {
        // The lock query is the one carrying a status filter (sessionNumber > target,
        // status IN_PROGRESS/COMPLETED); the other findFirst is the lastCheckIn lookup.
        if (args?.where?.status) return laterStartedRow;
        return { sessionNumber: 3 };
      }),
      create: jest.fn(async () => ({ id: 'ci-correction' })),
    },
  };
  const service = new ConversationService(
    prisma, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any,
  );
  return { service, prisma };
}

describe('GW-SELFCORRECT-LOCK: a prior session locks once the next one opens', () => {
  it('correcting BEFORE any later session has started succeeds', async () => {
    const { service, prisma } = makeService(null); // no later session started yet
    const res = await service.startSelfCorrectionSession('user1', 'g1', 1);
    expect(res.checkInId).toBe('ci-correction');
    expect(prisma.checkIn.create).toHaveBeenCalled();
  });

  it('correcting AFTER a later session has started is blocked (tripwire)', async () => {
    const { service, prisma } = makeService({ sessionNumber: 2 }); // a later session is already in progress/complete
    await expect(service.startSelfCorrectionSession('user1', 'g1', 1)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.checkIn.create).not.toHaveBeenCalled();
  });
});
