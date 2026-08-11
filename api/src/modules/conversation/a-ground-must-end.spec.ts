import { Cadence } from '@prisma/client';
import { ConversationService } from './conversation.service';

/**
 * A GROUND THAT HAS RUN ITS PLAN MUST STOP ASKING.
 *
 * Every completed check-in schedules the next one. The only stop conditions were
 * a ONE_TIME cadence and an `endsAt` date that is usually null, so a ground with
 * a perfectly well-defined plan never reached the end of it: completing the
 * final session created another, and completing that created another.
 *
 * Observed live on a ninety-day weekly ground, which plans twelve check-ins:
 *
 *     session 12  COMPLETED    isFinal   <- the plan ends here
 *     session 13  COMPLETED    isFinal
 *     session 14  COMPLETED    isFinal
 *     session 15  IN_PROGRESS  isFinal
 *
 * `isFinal` was computed correctly the whole time and used only to reword the
 * closing session's opening message. Nothing consulted it before creating the
 * next one.
 *
 * This is not tidiness. Each phantom session is a real ask of two real people,
 * with an email, about work that is finished - and the ground can never report
 * itself done, because there is always one more waiting. The journey found it
 * only because it carried a runaway guard; a person would have found it by being
 * asked to check in on a closed project every week forever.
 *
 * THESE TESTS DRIVE THE REAL SCHEDULER. An earlier version of this file
 * reimplemented the rule locally and asserted against its own copy - it passed
 * with the fix deleted, which makes it decoration rather than a guard.
 */

/**
 * The scheduler with a fake database, watching what it decides to create.
 *
 * createNextIfAbsent is private, which is the correct shape for it - so it is
 * reached the way the product reaches it, through ensureNextSession.
 */
function makeScheduler(cadence: Cadence, timelineDays: number) {
  const created: number[] = [];
  const prisma: any = {
    ground: {
      findUnique: jest.fn(async () => ({ cadence, timelineDays, cadenceAnchorDay: null, endsAt: null })),
    },
    checkIn: {
      findUnique: jest.fn(async () => null),      // nothing exists yet, so nothing is skipped as duplicate
      create: jest.fn(async (args: any) => { created.push(args.data.sessionNumber); return args.data; }),
      findFirst: jest.fn(async () => null),
      findMany: jest.fn(async () => []),
    },
    groundParticipant: { findUnique: jest.fn(async () => ({ partyType: 'PARTICIPANT' })), findMany: jest.fn(async () => []) },
  };
  const service = new ConversationService(
    prisma, {} as any, {} as any, {} as any,
    {} as any, {} as any, {} as any, {} as any, {} as any, {} as any,
  );
  const schedule = (justCompleted: number) =>
    (service as any).ensureNextSession('g1', 'p1', justCompleted);
  return { schedule, created };
}

describe('the last planned session is the last session', () => {
  it('stops a ninety-day weekly ground at twelve, which is where it ran away', async () => {
    const { schedule, created } = makeScheduler(Cadence.WEEKLY, 90);

    await schedule(11);   // finishing 11 schedules 12, the final one
    expect(created).toEqual([12]);

    // THE REGRESSION: finishing the final session created 13, then 14, then 15.
    await schedule(12);
    await schedule(13);
    await schedule(14);
    expect(created).toEqual([12]);
  });

  it('never blocks a session inside the plan', async () => {
    const { schedule, created } = makeScheduler(Cadence.WEEKLY, 90);
    for (let n = 1; n <= 11; n++) await schedule(n);
    expect(created).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it('holds for the other cadences a ground can be set up with', async () => {
    const fortnightly = makeScheduler(Cadence.FORTNIGHTLY, 90);   // plans 6
    await fortnightly.schedule(5);
    await fortnightly.schedule(6);
    expect(fortnightly.created).toEqual([6]);

    const monthly = makeScheduler(Cadence.MONTHLY, 90);           // plans 3
    await monthly.schedule(2);
    await monthly.schedule(3);
    expect(monthly.created).toEqual([3]);
  });

  it('leaves a cadence with no computable plan alone', async () => {
    /**
     * SEQUENTIAL has no clock - the next round fires when the lead checks in,
     * not on a timer - so there is no planned count to stop at, and this guard
     * must not invent one. Unknown is not zero, and treating it as zero would
     * stop a ground before it started.
     */
    const { schedule, created } = makeScheduler(Cadence.SEQUENTIAL, 90);
    await schedule(40);
    expect(created).toEqual([41]);
  });

  it('still gives a one-off ground exactly one session', async () => {
    const { schedule, created } = makeScheduler(Cadence.ONE_TIME, 90);
    await schedule(1);
    expect(created).toEqual([]);
  });
});
