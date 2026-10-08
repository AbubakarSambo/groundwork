import { ConversationService } from './conversation.service';

/**
 * TWO OPENS OF THE SAME SESSION AT ONCE MADE TWO FIRST QUESTIONS.
 * On the test bed the first open of a new check-in took 65 to 88 seconds. A second tab, or "Try again"
 * after the screen's wait, sent a second open beside the first, and the person was asked two different
 * first questions. The idempotency check reads the stored turn, which does not exist until the first
 * open has finished writing it, so it cannot see an open still in flight.
 *
 * A second open while the first is still working now waits for it and is given the same first question,
 * with no second model call. An open after a finished one reads the existing transcript, as before.
 */
function makeService() {
  const turns: any[] = [];
  const checkIn = {
    id: 'ci-1', groundId: 'g1', sessionNumber: 2, status: 'NOT_STARTED', isSelfCorrection: true,
    participant: { userId: 'user1', email: 'p@example.test' }, participantId: 'p1',
  };
  const prisma: any = {
    groundParticipant: { findMany: jest.fn(async () => [{ id: 'p1' }]) },
    checkIn: { findUnique: jest.fn(async () => checkIn), update: jest.fn(async () => ({})) },
    ground: {
      findUnique: jest.fn(async () => ({ status: 'ACTIVE', organizationId: 'org1', brief: 'A short brief.', subjectsToCover: null, whatACompleteAnswerHolds: null })),
      update: jest.fn(async () => ({})),
      updateMany: jest.fn(async () => ({ count: 1 })),
    },
    recordEntry: { findMany: jest.fn(async () => []) },
    conversationTurn: {
      findFirst: jest.fn(async () => turns[0] ?? null),
      findMany: jest.fn(async () => turns),
      create: jest.fn(async ({ data }: any) => { const t = { id: `t${turns.length + 1}`, createdAt: new Date(), ...data }; turns.push(t); return t; }),
    },
  };
  let n = 0;
  const anthropic: any = {
    /* Slow, and different every time it is asked, so two calls are two different questions. */
    respond: jest.fn(async () => { await new Promise((r) => setTimeout(r, 60)); n += 1; return `First question number ${n}?`; }),
    extract: jest.fn(async () => ({})),
  };
  const service = new ConversationService(
    prisma, {} as any, anthropic, {} as any, { emit: jest.fn() } as any, {} as any,
    { canStartSession: jest.fn() } as any, {} as any, { emit: jest.fn(() => Promise.resolve()) } as any, {} as any,
  );
  jest.spyOn(service as any, 'composeSystemPrompt').mockResolvedValue('SYSTEM');
  jest.spyOn(service as any, 'suggestedAnswersFor').mockResolvedValue([]);
  return { service, anthropic, turns };
}

describe('two opens of the same session at once', () => {
  it('ask the model once and give both the same first question', async () => {
    const { service, anthropic, turns } = makeService();
    const [a, b] = await Promise.all([service.open('ci-1', 'user1'), service.open('ci-1', 'user1')]);
    expect(anthropic.respond).toHaveBeenCalledTimes(1);
    expect(a.reply).toBe('First question number 1?');
    expect(b.reply).toBe(a.reply);
    expect(turns.filter((t) => t.role === 'AI')).toHaveLength(1);
  });

  it('an open after a finished one reads the existing first question, with no second call', async () => {
    const { service, anthropic } = makeService();
    const first = await service.open('ci-1', 'user1');
    const again = await service.open('ci-1', 'user1');
    expect(again.reply).toBe(first.reply);
    expect(anthropic.respond).toHaveBeenCalledTimes(1);
  });

  it('a failed open is not remembered: the next open tries again', async () => {
    const { service, anthropic } = makeService();
    anthropic.respond.mockRejectedValueOnce(new Error('the model is busy'));
    await expect(service.open('ci-1', 'user1')).rejects.toThrow();
    const next = await service.open('ci-1', 'user1');
    expect(next.reply).toMatch(/^First question number/);
  });
});
