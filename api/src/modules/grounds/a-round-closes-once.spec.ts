import { recordRoundCompletion } from './round-completion';
import { GroundworkEvents } from '../../common/events';

/**
 * A ROUND CLOSES ONCE, AND THE DATABASE IS WHAT MAKES THAT TRUE.
 *
 * Four places write a check-in to COMPLETED - the conversation when a session finishes, the entry
 * flow twice while a ground is being created, and the cron that auto-closes stale sessions. Each of
 * them now asks whether the round closed. If "has this already been recorded" were a read followed
 * by a write, two people finishing within the same moment would both see nothing and both emit,
 * and a report would be delivered twice. On a four-person round that is not an exotic race; it is
 * the ordinary shape of the last ten minutes before a deadline.
 *
 * So the unique row IS the guard, and the test for it is the failing insert rather than the happy
 * path. The rule itself is unchanged from the one the client has always used: everyone who is not
 * managing-only has a COMPLETED check-in at that session number.
 */
function harness(opts: { participants: number; done: number; insertFails?: boolean }) {
  const created: any[] = [];
  const prisma: any = {
    groundParticipant: {
      findMany: jest.fn(async () =>
        Array.from({ length: opts.participants }, (_, i) => ({ id: `p${i}` })),
      ),
    },
    checkIn: { count: jest.fn(async () => opts.done) },
    roundCompletion: {
      create: jest.fn(async (args: any) => {
        if (opts.insertFails) throw new Error('duplicate key value violates unique constraint');
        created.push(args.data);
        return args.data;
      }),
    },
  };
  const events: any = { emit: jest.fn() };
  return { prisma, events, created };
}

describe('a round closes once', () => {
  it('does not close while anyone is still out', async () => {
    const { prisma, events } = harness({ participants: 4, done: 3 });
    await expect(recordRoundCompletion(prisma, events, 'g1', 1)).resolves.toBe(false);
    expect(events.emit).not.toHaveBeenCalled();
    expect(prisma.roundCompletion.create).not.toHaveBeenCalled();
  });

  it('closes when the last person is in, and says who it was waiting on', async () => {
    const { prisma, events, created } = harness({ participants: 4, done: 4 });
    await expect(recordRoundCompletion(prisma, events, 'g1', 2)).resolves.toBe(true);
    expect(created).toEqual([{ groundId: 'g1', roundNumber: 2, participantCount: 4 }]);
    expect(events.emit).toHaveBeenCalledWith(GroundworkEvents.ROUND_COMPLETED, {
      groundId: 'g1',
      roundNumber: 2,
      participantCount: 4,
    });
  });

  it('emits nothing when the row is already there, and does not throw', async () => {
    /* THE RACE. Both callers see a complete round; the second one's insert is refused. It must not
       emit, and it must not fail - a check-in may never fail to complete because the round it
       belongs to was already known to be closed. */
    const { prisma, events } = harness({ participants: 2, done: 2, insertFails: true });
    await expect(recordRoundCompletion(prisma, events, 'g1', 1)).resolves.toBe(false);
    expect(events.emit).not.toHaveBeenCalled();
  });

  it('ignores managing-only people, because they are not who a round waits on', async () => {
    const { prisma, events } = harness({ participants: 2, done: 2 });
    await recordRoundCompletion(prisma, events, 'g1', 1);
    expect(prisma.groundParticipant.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { groundId: 'g1', managingOnly: false } }),
    );
  });

  it('counts only the round it was asked about', async () => {
    const { prisma, events } = harness({ participants: 1, done: 1 });
    await recordRoundCompletion(prisma, events, 'g1', 7);
    expect(prisma.checkIn.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ sessionNumber: 7 }) }),
    );
  });

  it('a ground with nobody to hear from has not closed a round', async () => {
    /* Otherwise an empty or misconfigured ground closes round after round against an empty list. */
    const { prisma, events } = harness({ participants: 0, done: 0 });
    await expect(recordRoundCompletion(prisma, events, 'g1', 1)).resolves.toBe(false);
    expect(events.emit).not.toHaveBeenCalled();
  });
});
