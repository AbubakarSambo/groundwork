import { ConversationService } from './conversation.service';

/**
 * REQUEST 30(a): WHEN TWO OPENS RACE FOR THE LAST CHECK-IN, THE LOSER READS BILLING'S SENTENCE.
 *
 * It read "This check-in is beyond your ten free check-ins…", which is untrue for an organisation
 * with no free plan. The person now reads what billing says about their organisation.
 */
it('the person who loses the race reads billing\'s own sentence', async () => {
  const paused = 'This check-in is paused until your team subscribes. Only an admin can do that, and your answers so far are kept.';
  const canStartSession = jest.fn()
    .mockResolvedValueOnce({ allowed: true, sessionsBalance: 1 })
    .mockResolvedValueOnce({ allowed: false, reason: paused, sessionsBalance: 0 });
  const checkIn = { id: 'ci-1', groundId: 'g1', sessionNumber: 2, status: 'NOT_STARTED', isSelfCorrection: false, participant: { userId: 'u1', email: 'p@example.test' }, participantId: 'p1' };
  const prisma: any = {
    checkIn: { findUnique: jest.fn(async () => checkIn), update: jest.fn(async () => ({})) },
    ground: { findUnique: jest.fn(async () => ({ status: 'ACTIVE', organizationId: 'org1' })), updateMany: jest.fn(async () => ({ count: 0 })) },
    groundParticipant: { findMany: jest.fn(async () => []) },
    recordEntry: { findMany: jest.fn(async () => []) },
    conversationTurn: { findFirst: jest.fn(async () => null), findMany: jest.fn(async () => []), create: jest.fn() },
  };
  const service = new ConversationService(prisma, {} as any, { respond: jest.fn(), extract: jest.fn(async () => ({})) } as any, {} as any, { emit: jest.fn() } as any, {} as any, { canStartSession } as any, {} as any, { emit: jest.fn() } as any, {} as any);
  jest.spyOn(service as any, 'composeSystemPrompt').mockResolvedValue('SYSTEM');
  const err: any = await service.open('ci-1', 'u1').catch((e) => e);
  expect(err?.getResponse?.()?.message).toBe(paused);
  expect(JSON.stringify(err?.getResponse?.())).not.toMatch(/ten free/);
});
