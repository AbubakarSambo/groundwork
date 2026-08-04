import { ConversationService } from './conversation.service';

/**
 * GW-POSTSIGNOFF-FLAG tripwire (Honest Corrections).
 *
 * Sign-off does not block startSelfCorrectionSession() - a signed-off
 * participant can still correct a session. What must happen is that the new
 * correction CheckIn is stamped isPostSignOff: true when the initiating
 * participant had already signed off (GroundParticipant.signedOffAt set), and
 * isPostSignOff: false when they had not. This is what lets the shared report
 * (reports.service.ts's `updates` field) and the late-correction email
 * (reports.listener.ts) tell a pre-sign-off correction apart from one that
 * lands after the other party may have already acted on the shared report.
 *
 * If the stamping line in startSelfCorrectionSession is removed or hardcoded
 * to false, the "signed off" test below goes red (isPostSignOff: false is
 * passed to create() instead of true) - that is the real tripwire.
 */
function makeService(signedOffAt: Date | null) {
  const prisma: any = {
    groundParticipant: { findFirst: jest.fn(async () => ({ id: 'p1', groundId: 'g1', signedOffAt })) },
    checkIn: {
      findUnique: jest.fn(async () => ({ id: 'ci-target', status: 'COMPLETED', sessionNumber: 1 })),
      findFirst: jest.fn(async (args: any) => {
        // No later session started - the lock check must pass through.
        if (args?.where?.status) return null;
        return { sessionNumber: 1 };
      }),
      create: jest.fn(async (args: any) => ({ id: 'ci-correction', ...args.data })),
    },
  };
  const service = new ConversationService(
    prisma, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any,
  );
  return { service, prisma };
}

describe('GW-POSTSIGNOFF-FLAG: self-correction sessions are stamped isPostSignOff by sign-off state', () => {
  it('correcting BEFORE sign-off stamps isPostSignOff: false', async () => {
    const { service, prisma } = makeService(null);
    await service.startSelfCorrectionSession('user1', 'g1', 1);
    expect(prisma.checkIn.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ isPostSignOff: false }) }),
    );
  });

  it('correcting AFTER sign-off stamps isPostSignOff: true (tripwire)', async () => {
    const { service, prisma } = makeService(new Date('2026-01-01'));
    await service.startSelfCorrectionSession('user1', 'g1', 1);
    expect(prisma.checkIn.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ isPostSignOff: true }) }),
    );
  });
});
