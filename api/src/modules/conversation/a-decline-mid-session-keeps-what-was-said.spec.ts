import { CheckInStatus } from '@prisma/client';
import { ConversationService, DECLINED_TO_TAKE_PART } from './conversation.service';

/**
 * A DECLINE MID-SESSION KEEPS WHAT WAS SAID.
 *
 * decline() permits IN_PROGRESS - somebody can say no partway through - and it wrote DECLINED and
 * nothing else, so every turn they had already given never reached their private record. What they
 * said is theirs. Their conversation is assessed like any that ended, and its record is written from the
 * assessment by the one writer (one source, part 2), and the reason is written, so a reader can tell a
 * decline from a close.
 */
/**
 * `parties` is what the ground has to hear from. Empty by default, so `recordRoundCompletion`
 * answers "this round is not closed" and the decline path stops there - these four tests are about
 * what a decline keeps, not about what closing a round does. The fifth passes a real roster.
 */
const service = (status: CheckInStatus, parties: { id: string }[] = []) => {
  const events = { emit: jest.fn() };
  const prisma: any = {
    checkIn: {
      findUnique: jest.fn(async () => ({ id: 'ci', groundId: 'g', participantId: 'p', sessionNumber: 1, status, participant: { userId: 'me', user: { awaitingOrgApproval: false } } })),
      update: jest.fn(async (a: any) => a),
      count: jest.fn(async ({ where }: any) => (where?.status === CheckInStatus.COMPLETED ? 1 : parties.length)),
      findFirst: jest.fn(async () => ({ id: 'theirs', participantId: 'other' })),
    },
    groundParticipant: { findMany: jest.fn(async () => parties) },
    roundCompletion: { create: jest.fn(async () => ({})) },
    reportRound: { findUnique: jest.fn(async () => null) },
    groundObjective: { findMany: jest.fn(async () => []) },
    groundObjectiveSnapshot: { createMany: jest.fn(async () => ({})) },
  };
  const svc: any = new ConversationService(prisma, {} as any, {} as any, {} as any, events as any, {} as any, {} as any, {} as any, {} as any, { get: () => undefined } as any);
  svc.assessAndThenRead = jest.fn(async () => undefined);
  return { svc, prisma, events };
};

describe('declining', () => {
  it('partway through, what was said is assessed, and so written to their record, once the session is marked declined', async () => {
    const { svc, prisma } = service(CheckInStatus.IN_PROGRESS);
    await svc.decline('ci', 'me');
    expect(svc.assessAndThenRead).toHaveBeenCalledWith(expect.objectContaining({ id: 'ci', participantId: 'p' }), expect.objectContaining({ howItEnded: 'declined' }));
    expect(prisma.checkIn.update.mock.invocationCallOrder[0]).toBeLessThan(svc.assessAndThenRead.mock.invocationCallOrder[0]);
  });

  it('before starting assesses nothing, because nothing was said', async () => {
    const { svc } = service(CheckInStatus.NOT_STARTED);
    await svc.decline('ci', 'me');
    expect(svc.assessAndThenRead).not.toHaveBeenCalled();
  });

  it('writes the reason', async () => {
    const { svc, prisma } = service(CheckInStatus.NOT_STARTED);
    await svc.decline('ci', 'me');
    expect(prisma.checkIn.update).toHaveBeenCalledWith({ where: { id: 'ci' }, data: { status: CheckInStatus.DECLINED, closedReason: DECLINED_TO_TAKE_PART } });
    expect(DECLINED_TO_TAKE_PART).toBe('declined');
  });

  it('closes the round when it was the last answer, so the report does not wait for the 3am sweep', async () => {
    /**
     * THE ONE THIS WAS MISSING. Every reader counts a decline as an answer; the decline itself
     * recorded nothing, so a round it completed stayed open in the record and its report - already
     * written - waited overnight.
     */
    const { svc, events, prisma } = service(CheckInStatus.NOT_STARTED, [{ id: 'p' }]);
    await svc.decline('ci', 'me');
    expect(prisma.roundCompletion.create).toHaveBeenCalled();
    const released = events.emit.mock.calls.find((c: any[]) => c[0] === 'checkin.completed');
    expect(released).toBeTruthy();
    /* Carried as a repair, so nobody is told somebody checked in. Nobody did. */
    expect(released![1]).toMatchObject({ groundId: 'g', sessionNumber: 1, source: 'repair' });
  });

  it('but says nothing when a report for that round has already gone out', async () => {
    const { svc, events, prisma } = service(CheckInStatus.NOT_STARTED, [{ id: 'p' }]);
    prisma.reportRound.findUnique = jest.fn(async () => ({ id: 'already' }));
    await svc.decline('ci', 'me');
    expect(events.emit.mock.calls.find((c: any[]) => c[0] === 'checkin.completed')).toBeFalsy();
  });

  it('a failed assessment does not stop the decline - saying no must always work', async () => {
    const { svc, prisma } = service(CheckInStatus.IN_PROGRESS);
    svc.assessAndThenRead = jest.fn(async () => { throw new Error('model down'); });
    svc.logger = { warn: jest.fn(), log: jest.fn(), error: jest.fn() };
    await expect(svc.decline('ci', 'me')).resolves.toEqual({ status: 'declined' });
    expect(prisma.checkIn.update).toHaveBeenCalled();
  });
});
