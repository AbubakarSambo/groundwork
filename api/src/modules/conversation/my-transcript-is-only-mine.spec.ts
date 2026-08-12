import { ForbiddenException } from '@nestjs/common';
import { ConversationService } from './conversation.service';

/**
 * THE GROUND'S CHAT VIEW SHOWS ONE PERSON'S WORDS: THEIRS.
 *
 * `getMyGroundTranscript` feeds the view a ground opens to - sessions in order,
 * turns as messages, dividers between them. That shape is exactly where somebody
 * would expect to see other people talking, and in this product they never can:
 * a check-in is private until the report releases, and even then the report never
 * quotes anybody.
 *
 * So the guarantee is structural rather than a filter applied afterwards. The
 * participant row is found from the requesting user's own id, and turns are read
 * by that participant id - there is no argument to this function that could name
 * somebody else. These tests pin that, and pin the refusal for a non-party.
 */
describe('getMyGroundTranscript', () => {
  function make(overrides: any = {}) {
    const prisma: any = {
      // `?? ` would swallow the null this test needs: "not a party" is exactly
      // the case where findFirst returns null, and `null ?? {id}` is `{id}`.
      groundParticipant: {
        findFirst: jest.fn(async () => ('participant' in overrides ? overrides.participant : { id: 'p-me' })),
      },
      checkIn: { findMany: jest.fn(async () => overrides.checkIns ?? []) },
    };
    const service = new ConversationService(
      prisma,
      { get: () => undefined } as any, { get: () => undefined } as any, { get: () => undefined } as any,
      { get: () => undefined } as any, { get: () => undefined } as any, { get: () => undefined } as any,
      { get: () => undefined } as any, { get: () => undefined } as any, { get: () => undefined } as any,
    );
    return { service, prisma };
  }

  it('refuses somebody who is not a party to the ground', async () => {
    const { service } = make({ participant: null });
    await expect(service.getMyGroundTranscript('g1', 'u-stranger')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('reads turns by the requesting person\'s own participant id, not by the ground', async () => {
    // The one that matters. A query scoped to the ground would return every
    // party's turns and rely on something downstream to drop them.
    const { service, prisma } = make();
    await service.getMyGroundTranscript('g1', 'u-me');
    expect(prisma.groundParticipant.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { groundId: 'g1', userId: 'u-me' } }),
    );
    const where = prisma.checkIn.findMany.mock.calls[0][0].where;
    expect(where).toEqual({ participantId: 'p-me' });
    expect(where).not.toHaveProperty('groundId');
  });

  it('returns sessions oldest first, so the view can read downwards', async () => {
    const { service, prisma } = make();
    await service.getMyGroundTranscript('g1', 'u-me');
    expect(prisma.checkIn.findMany.mock.calls[0][0].orderBy).toEqual({ sessionNumber: 'asc' });
  });

  it('dates a finished session by when it was finished, and an open one by when it opened', async () => {
    // The divider needs a date. A session spans days, so "completed" places a
    // finished one; an unfinished one has no completion date and would otherwise
    // render an empty divider.
    const { service } = make({
      checkIns: [
        { id: 'c1', sessionNumber: 1, status: 'COMPLETED', completedAt: new Date('2026-08-10'), createdAt: new Date('2026-08-01'), isSelfCorrection: false, selfCorrectionTargetSession: null, turns: [] },
        { id: 'c2', sessionNumber: 2, status: 'IN_PROGRESS', completedAt: null, createdAt: new Date('2026-08-24'), isSelfCorrection: false, selfCorrectionTargetSession: null, turns: [] },
      ],
    });
    const out = await service.getMyGroundTranscript('g1', 'u-me');
    expect(out.sessions[0].date).toBe(new Date('2026-08-10').toISOString());
    expect(out.sessions[1].date).toBe(new Date('2026-08-24').toISOString());
  });

  it('carries the turns through in the order they were said', async () => {
    const { service } = make({
      checkIns: [{
        id: 'c1', sessionNumber: 1, status: 'COMPLETED', completedAt: new Date('2026-08-10'), createdAt: new Date('2026-08-01'),
        isSelfCorrection: false, selfCorrectionTargetSession: null,
        turns: [
          { id: 't1', role: 'AI', content: 'What is going on?' },
          { id: 't2', role: 'PERSON', content: 'The scope moved.' },
        ],
      }],
    });
    const out = await service.getMyGroundTranscript('g1', 'u-me');
    expect(out.sessions[0].turns.map((t: any) => t.content)).toEqual(['What is going on?', 'The scope moved.']);
  });
});
