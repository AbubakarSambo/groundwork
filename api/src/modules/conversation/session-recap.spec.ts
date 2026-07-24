import { ConversationService } from './conversation.service';

/**
 * #3: continuity was real in the model's prompt (composeSystemPrompt's
 * PRIOR_SESSION block) and in the final report, but invisible to the person -
 * a normal session 2+ open (not self-correction) showed nothing of their own
 * prior answers, leaving continuity entirely dependent on whether the AI's
 * opening line happened to mention it. getTranscript() now also returns
 * priorRecordEntries: the person's own record entries from every completed
 * prior session, grouped by session, for a read-only client recap. This
 * locks: (1) it's populated for a normal session 2+ open, (2) NOT populated
 * for session 1 (nothing prior exists), (3) NOT populated for self-correction
 * sessions (those already get the richer full-turn replay via priorTurns).
 */

function makeService(checkInRow: any, priorCheckIns: any[], entriesByCheckInId: Record<string, any[]>) {
  const prisma: any = {
    checkIn: {
      findUnique: jest.fn(async () => checkInRow),
      findMany: jest.fn(async () => priorCheckIns),
    },
    conversationTurn: {
      findMany: jest.fn(async () => []),
    },
    recordEntry: {
      findMany: jest.fn(async ({ where }: any) => entriesByCheckInId[where.checkInId] ?? []),
    },
    ground: {
      findUnique: jest.fn(async () => ({ label: 'Test Ground', scenario: 'NEW_PROJECT' })),
    },
    groundParticipant: {
      findUnique: jest.fn(async () => checkInRow?.participant ?? null),
    },
  };

  return new ConversationService(
    prisma,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    { emit: () => Promise.resolve() } as any,
    { get: () => '' } as any,
  );
}

const BASE_PARTICIPANT = { id: 'p1', userId: 'user-1', groundId: 'g1', partyType: 'INITIATOR' };

describe('#3 session recap: priorRecordEntries on getTranscript()', () => {
  it('is populated on a normal session 2 open, grouped by prior session', async () => {
    const checkIn = {
      id: 'ci2', participantId: 'p1', groundId: 'g1', sessionNumber: 2, status: 'IN_PROGRESS',
      isSelfCorrection: false, selfCorrectionTargetSession: null, participant: BASE_PARTICIPANT,
    };
    const service = makeService(
      checkIn,
      [{ id: 'ci1', sessionNumber: 1 }],
      { ci1: [{ type: 'WORRY', text: 'The timeline feels tight.' }, { type: 'COMMITMENT', text: 'Ship by day 60.' }] },
    );
    const result = await service.getTranscript('ci2', 'user-1');
    expect(result.priorRecordEntries).toEqual([
      { sessionNumber: 1, entries: [{ type: 'WORRY', text: 'The timeline feels tight.' }, { type: 'COMMITMENT', text: 'Ship by day 60.' }] },
    ]);
  });

  it('is empty on session 1 - there is no prior session', async () => {
    const checkIn = {
      id: 'ci1', participantId: 'p1', groundId: 'g1', sessionNumber: 1, status: 'IN_PROGRESS',
      isSelfCorrection: false, selfCorrectionTargetSession: null, participant: BASE_PARTICIPANT,
    };
    const service = makeService(checkIn, [], {});
    const result = await service.getTranscript('ci1', 'user-1');
    expect(result.priorRecordEntries).toEqual([]);
  });

  it('is empty on a self-correction session - that already gets the full prior-turn replay', async () => {
    const checkIn = {
      id: 'ci2', participantId: 'p1', groundId: 'g1', sessionNumber: 2, status: 'IN_PROGRESS',
      isSelfCorrection: true, selfCorrectionTargetSession: 1, participant: BASE_PARTICIPANT,
    };
    const service = makeService(
      checkIn,
      [{ id: 'ci1', sessionNumber: 1 }],
      { ci1: [{ type: 'WORRY', text: 'Should not appear here.' }] },
    );
    const result = await service.getTranscript('ci2', 'user-1');
    expect(result.priorRecordEntries).toEqual([]);
  });
});
