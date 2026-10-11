import { PrismaService } from '../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CheckInStatus } from '@prisma/client';
import { GroundworkEvents, RoundCompletedEvent } from '../../common/events';
import { AN_ANSWER, AT_LEAST_ONE_ACCOUNT, NOT_A_QUIET_CLOSE } from './an-answer-includes-a-refusal';
import { whoOnACheckInIsAway } from '../suites/who-is-away';
import { whoIsNotLetInYet } from './who-an-admin-did-not-let-in';
import { whoASessionCounts } from './the-lead-checks-in-when-they-choose';

/**
 * A ROUND CLOSING, DECIDED IN ONE PLACE.
 *
 * The rule was not changed when this was written: a round was complete when every participant who
 * is not managing-only had a COMPLETED check-in at that session number. IT IS CHANGED NOW, on
 * purpose, and here is the reversal stated: a round is complete when everybody has ANSWERED - and a
 * decline is an answer (an-answer-includes-a-refusal.ts). Counting only COMPLETED froze every round
 * with one refusal in it, for that session and all that followed. At least one account must be
 * COMPLETED, or there is nothing to report. What is unchanged is where the rule lives.
 * It lived on the client - GroundAdminPage, recomputed from the check-in list on every render - so
 * the server never knew a round had closed and nothing could act on it.
 *
 * A plain function rather than a service because four different places write a check-in to
 * COMPLETED: the conversation when a session finishes, the entry flow twice while creating a
 * ground, and the cron that auto-closes stale sessions. A Nest service would mean each of those
 * importing a module that imports them back.
 *
 * IDEMPOTENT BY THE DATABASE, NOT BY A CHECK. The unique row is the guard: a second call for the
 * same round loses the insert and emits nothing. A guard written as "look first, then write" would
 * be a race between two people finishing at the same moment, which on a four-person round is not a
 * rare event - it is the normal shape of the last ten minutes before a deadline.
 */
export async function recordRoundCompletion(
  prisma: PrismaService,
  events: EventEmitter2,
  groundId: string,
  roundNumber: number,
): Promise<boolean> {
  const everyone = await prisma.groundParticipant.findMany({
    /* Decision 133: the lead is counted only when they answered this round, never waited on. */
    where: { groundId, ...whoASessionCounts(roundNumber, AN_ANSWER) },
    select: { id: true, userId: true },
  });
  /*
   * NOBODY AN ADMIN HAS NOT LET IN YET (decision 77). They cannot answer, so the session does not wait
   * on them: it closes once everybody let in has answered. Anything they did answer still counts. Once
   * they are let in they are waited on again, from the next time this is asked.
   */
  const notLetIn = await whoIsNotLetInYet(prisma, everyone as any[]);
  const theyAnsweredIt = notLetIn.size
    ? new Set(((await (prisma.checkIn.findMany?.({
      where: { groundId, sessionNumber: roundNumber, status: { in: AN_ANSWER }, participantId: { in: [...notLetIn.keys()] } },
      select: { participantId: true },
    }) as any) ?? []) as any[]).map((c) => c.participantId))
    : new Set<string>();
  const participants = everyone.filter((p) => !notLetIn.has(p.id) || theyAnsweredIt.has(p.id));
  /*
   * A ground with nobody to hear from has not completed a session; it is misconfigured. Returning
   * false keeps it out of the record rather than closing session after session against an empty list.
   */
  if (participants.length === 0) return false;

  const answered = await prisma.checkIn.count({
    where: {
      groundId,
      sessionNumber: roundNumber,
      status: { in: AN_ANSWER },
      participantId: { in: participants.map((p) => p.id) },
    },
  });
  /* Somebody on approved leave today is not waited on (week 23). Those who answered anyway are
     already in `answered`; the ones who did not are taken off what the round needs. */
  const away = await whoOnACheckInIsAway(prisma, groundId);
  let notWaitedOn = 0;
  if (away.size) {
    const spoke = await prisma.checkIn.findMany({
      where: { groundId, sessionNumber: roundNumber, status: { in: AN_ANSWER }, participantId: { in: [...away.keys()] } },
      select: { participantId: true },
    });
    const spokeIds = new Set(spoke.map((c) => c.participantId));
    notWaitedOn = [...away.keys()].filter((id) => participants.some((p) => p.id === id) && !spokeIds.has(id)).length;
  }
  if (answered < participants.length - notWaitedOn) return false;
  const completed = await prisma.checkIn.count({
    where: {
      groundId,
      sessionNumber: roundNumber,
      status: CheckInStatus.COMPLETED,
      /* A session the clock closed with nothing said is not an account (the round still closes without waiting on it). */
      AND: [NOT_A_QUIET_CLOSE],
      participantId: { in: participants.map((p) => p.id) },
    },
  });
  if (completed < AT_LEAST_ONE_ACCOUNT) return false;

  try {
    await prisma.roundCompletion.create({
      data: { groundId, sessionNumber: roundNumber, participantCount: participants.length - notWaitedOn },
    });
  } catch {
    /*
     * The unique constraint refused it, so this round was already recorded and somebody else has
     * already emitted for it. Swallowed rather than rethrown: a check-in must never fail to
     * complete because the round it belongs to was already known to be closed.
     */
    return false;
  }

  /*
   * THE OBJECTIVES, AS THEY STOOD WHEN THE ROUND CLOSED. Movement used to be `count - prevCount`,
   * and prevCount defaults to 0, so an objective never edited reported its whole lifetime as this
   * session's movement. A snapshot per objective per round makes "moved this session" the difference
   * between two rows, and nothing at all when there is only one (what-this-session-holds.ts).
   * Best-effort: a round closes whether or not its snapshot is written.
   */
  try {
    const objectives = await prisma.groundObjective.findMany({ where: { groundId }, select: { id: true, count: true } });
    if (objectives.length) {
      await prisma.groundObjectiveSnapshot.createMany({
        data: objectives.map((o) => ({ groundId, objectiveId: o.id, sessionNumber: roundNumber, count: o.count })),
        skipDuplicates: true,
      });
    }
  } catch {
    /* A missing snapshot reads as "movement not known", which is honest; a failed round close is not. */
  }

  events.emit(GroundworkEvents.ROUND_COMPLETED, {
    groundId,
    sessionNumber: roundNumber,
    participantCount: participants.length,
  } satisfies RoundCompletedEvent);
  return true;
}
