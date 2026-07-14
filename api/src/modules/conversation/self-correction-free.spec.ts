import { ConversationService } from './conversation.service';
import { BadRequestException } from '@nestjs/common';

/**
 * GW-SELFCORRECT-FREE tripwire.
 *
 * A participant correcting an error in their OWN prior record must always be able
 * to - never gated on payment, never billed as a fresh $5 session. Two guarantees,
 * both regression-prone:
 *
 *   1. open(): a self-correction check-in opens even when the ground's
 *      sessionsBalance is 0. The billing gate (canStartSession) is skipped
 *      entirely for self-correction, so no paywall and no decrement.
 *
 *   2. complete(): a self-correction check-in closes after a SINGLE substantive
 *      turn. A correction is short by nature; the standard 3-turn thin-record gate
 *      would strand it (the engine closes after one or two exchanges, the input
 *      disables, and completion 400s for a turn the person can no longer add).
 *
 * If either exemption is removed, the matching test goes red.
 */

function baseCheckIn(overrides: any = {}) {
  return {
    id: 'ci-correction',
    groundId: 'g1',
    sessionNumber: 2,
    status: 'NOT_STARTED',
    isSelfCorrection: true,
    participant: { userId: 'user1', email: 'p@example.test' },
    participantId: 'p1',
    ...overrides,
  };
}

function makeService(checkIn: any, canStartSession: jest.Mock) {
  const prisma: any = {
    checkIn: {
      findUnique: jest.fn(async () => checkIn),
      update: jest.fn(async () => ({ status: 'COMPLETED', groundId: 'g1' })),
    },
    ground: {
      findUnique: jest.fn(async () => ({ status: 'ACTIVE', organizationId: 'org1', isFreeGround: false })),
      updateMany: jest.fn(async () => ({ count: 1 })),
    },
    conversationTurn: {
      findFirst: jest.fn(async () => null), // no existing AI turn, no round already started
      findMany: jest.fn(async () => []),
      create: jest.fn(async ({ data }: any) => ({ content: data.content })),
    },
  };
  const billing: any = { canStartSession };
  const anthropic: any = { respond: jest.fn(async () => 'opener text') };
  const events: any = { emit: jest.fn() };
  const usage: any = { emit: jest.fn(() => Promise.resolve()) };
  const service = new ConversationService(
    prisma,
    {} as any, // prompts
    anthropic,
    {} as any, // context
    events,
    {} as any, // documents
    billing,
    {} as any, // email
    usage,
    {} as any, // config
  );
  // composeSystemPrompt reaches into context/prompts; stub it - the gate, not the
  // prompt, is what these tripwires assert on.
  jest.spyOn(service as any, 'composeSystemPrompt').mockResolvedValue('SYSTEM');
  return { service, prisma, billing };
}

describe('GW-SELFCORRECT-FREE: correcting your own record is never paywalled', () => {
  it('open(): a self-correction opens on a zero-balance ground without hitting the billing gate (tripwire)', async () => {
    const canStartSession = jest.fn(async () => ({ allowed: false, reason: 'No sessions remaining. Add a session for $5 to continue.', sessionsBalance: 0 }));
    const { service, prisma, billing } = makeService(baseCheckIn(), canStartSession);

    const res = await service.open('ci-correction', 'user1');

    expect(res.reply).toBe('opener text');
    // The gate is skipped entirely: canStartSession is never consulted...
    expect(billing.canStartSession).not.toHaveBeenCalled();
    // ...and the balance is never decremented (updateMany is only the decrement here).
    expect(prisma.ground.updateMany).not.toHaveBeenCalled();
  });

  it('open(): a NORMAL session still consults the billing gate (guards against over-broad exemption)', async () => {
    const canStartSession = jest.fn(async () => ({ allowed: true, sessionsBalance: 5 }));
    const { service, billing } = makeService(baseCheckIn({ isSelfCorrection: false }), canStartSession);

    await service.open('ci-correction', 'user1');

    expect(billing.canStartSession).toHaveBeenCalled();
  });

  it('complete(): a self-correction closes after ONE substantive turn (tripwire)', async () => {
    const canStartSession = jest.fn();
    const { service, prisma } = makeService(baseCheckIn({ status: 'IN_PROGRESS' }), canStartSession);
    // One real correction turn - below the standard 3-turn floor, above the 40-char substance floor.
    prisma.conversationTurn.findMany = jest.fn(async () => [
      { content: 'The October reconvene date is actually provisional, not fixed, and still needs confirmation.' },
    ]);
    jest.spyOn(service as any, 'scoreSessionSpecificity').mockResolvedValue(null);
    jest.spyOn(service as any, 'extractRecordEntries').mockResolvedValue(undefined);
    jest.spyOn(service as any, 'buildSoloArtifact').mockResolvedValue(undefined);
    jest.spyOn(service as any, 'ensureNextSession').mockResolvedValue(undefined);

    await service.complete('ci-correction', 'user1');

    expect(prisma.checkIn.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'COMPLETED' }) }),
    );
  });

  it('complete(): a NORMAL session still requires 3 turns (guards against over-broad exemption)', async () => {
    const canStartSession = jest.fn();
    const { service, prisma } = makeService(baseCheckIn({ isSelfCorrection: false, status: 'IN_PROGRESS' }), canStartSession);
    prisma.conversationTurn.findMany = jest.fn(async () => [
      { content: 'The October reconvene date is actually provisional, not fixed, and still needs confirmation.' },
    ]);
    jest.spyOn(service as any, 'scoreSessionSpecificity').mockResolvedValue(null);
    jest.spyOn(service as any, 'extractRecordEntries').mockResolvedValue(undefined);

    await expect(service.complete('ci-correction', 'user1')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.checkIn.update).not.toHaveBeenCalled();
  });
});
