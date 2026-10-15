import { ConversationService } from './conversation.service';

/**
 * REQUEST 44: OPENING A SESSION TOOK 14 TO 60 SECONDS.
 *
 * On the first open of a check-in, the opener's prompt needs two reads of the lead's brief (the
 * subjects it asks about, and the frame of a complete answer). Each is a model call. They ran one
 * after the other, at the end of the prompt's other reads, before the opener was asked for at all.
 * `open` now starts both at the door, side by side, and the prompt picks up the same reads.
 *
 * What this checks, from the outside: each read is asked for once, the second starts before the
 * first has finished, and the first question the person reads is exactly what the model wrote.
 *
 * THIS USED TO ALSO ASSERT A WALL-CLOCK BUDGET (`took` under 290ms, for two 150ms reads). That is
 * the same proof restated as a clock, and a clock is the wrong witness: under parallel jest load - a
 * real CI box running every suite at once - the event loop falls behind and 150ms of `setTimeout`
 * becomes 300ms of wall time with nothing sequential about it, so the assertion failed on a run that
 * was doing exactly what it was supposed to. The order check below (`second.startedAt` before
 * `first.endedAt`) proves the same fact - the two reads overlap rather than queuing - without caring
 * how long either one actually took, so it holds under load and still fails the moment the reads go
 * back to running one after another. Checked by temporarily awaiting them in series inside the
 * `composeSystemPrompt` mock below: the order assertion failed, as it must, and was restored.
 */

const A_LONG_BRIEF = Array.from({ length: 60 }, (_, i) => `word${i}`).join(' ');

function makeService(extractMs: number) {
  const checkIn = {
    id: 'ci-1', groundId: 'g1', sessionNumber: 2, status: 'NOT_STARTED', isSelfCorrection: true,
    participant: { userId: 'user1', email: 'p@example.test' }, participantId: 'p1',
  };
  const prisma: any = {
    groundParticipant: { findMany: jest.fn(async () => [{ id: 'p1' }]) },
    checkIn: { findUnique: jest.fn(async () => checkIn), update: jest.fn(async () => ({})) },
    ground: {
      findUnique: jest.fn(async () => ({ status: 'ACTIVE', organizationId: 'org1', brief: A_LONG_BRIEF, subjectsToCover: null, whatACompleteAnswerHolds: null })),
      update: jest.fn(async () => ({})),
      updateMany: jest.fn(async () => ({ count: 1 })),
    },
    recordEntry: { findMany: jest.fn(async () => []) },
    conversationTurn: {
      findFirst: jest.fn(async () => null),
      findMany: jest.fn(async () => []),
      create: jest.fn(async ({ data }: any) => ({ id: 't1', content: data.content })),
    },
  };
  const calls: { schema: string; startedAt: number; endedAt?: number }[] = [];
  const anthropic: any = {
    respond: jest.fn(async () => 'What would you like to change in session one?'),
    extract: jest.fn(async (system: string) => {
      const call = { schema: system.slice(0, 40), startedAt: Date.now() } as { schema: string; startedAt: number; endedAt?: number };
      calls.push(call);
      await new Promise((r) => setTimeout(r, extractMs));
      call.endedAt = Date.now();
      return {};
    }),
  };
  const service = new ConversationService(
    prisma, {} as any, anthropic, {} as any, { emit: jest.fn() } as any, {} as any,
    { canStartSession: jest.fn() } as any, {} as any, { emit: jest.fn(() => Promise.resolve()) } as any, {} as any,
  );
  /* The prompt reads both, one after the other, the way the real prompt does. */
  jest.spyOn(service as any, 'composeSystemPrompt').mockImplementation(async () => {
    await new Promise((r) => setTimeout(r, 20));
    await service.theSubjectsToCover('g1');
    await service.theFrameFor('g1');
    return 'SYSTEM';
  });
  jest.spyOn(service as any, 'suggestedAnswersFor').mockResolvedValue([]);
  return { service, anthropic, calls };
}

describe('Opening a session reads the brief side by side (request 44)', () => {
  it('asks for each read of the brief once, and the two overlap', async () => {
    const { service, anthropic, calls } = makeService(150);
    const res = await service.open('ci-1', 'user1');

    expect(anthropic.extract).toHaveBeenCalledTimes(2);
    const [first, second] = [...calls].sort((a, b) => a.startedAt - b.startedAt);
    /* THE PROOF: the second read starts before the first has finished. Order, not a clock - see the
       comment above for why a wall-time budget is the wrong witness under parallel jest load. */
    expect(second.startedAt).toBeLessThan(first.endedAt!);

    /* The first question is what the model wrote, word for word. */
    expect(res.reply).toBe('What would you like to change in session one?');
  });
});
