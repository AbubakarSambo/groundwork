import { PrismaService } from '../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CheckInStatus } from '@prisma/client';
import { GroundworkEvents, RoundCompletedEvent } from '../../common/events';

/**
 * A ROUND CLOSING, DECIDED IN ONE PLACE.
 *
 * The rule is not new and is not changed here: a round is complete when every participant who is
 * not managing-only has a COMPLETED check-in at that session number. What is new is where it lives.
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
  const participants = await prisma.groundParticipant.findMany({
    where: { groundId, managingOnly: false },
    select: { id: true },
  });
  /*
   * A ground with nobody to hear from has not completed a round; it is misconfigured. Returning
   * false keeps it out of the record rather than closing round after round against an empty list.
   */
  if (participants.length === 0) return false;

  const done = await prisma.checkIn.count({
    where: {
      groundId,
      sessionNumber: roundNumber,
      status: CheckInStatus.COMPLETED,
      participantId: { in: participants.map((p) => p.id) },
    },
  });
  if (done < participants.length) return false;

  try {
    await prisma.roundCompletion.create({
      data: { groundId, roundNumber, participantCount: participants.length },
    });
  } catch {
    /*
     * The unique constraint refused it, so this round was already recorded and somebody else has
     * already emitted for it. Swallowed rather than rethrown: a check-in must never fail to
     * complete because the round it belongs to was already known to be closed.
     */
    return false;
  }

  events.emit(GroundworkEvents.ROUND_COMPLETED, {
    groundId,
    roundNumber,
    participantCount: participants.length,
  } satisfies RoundCompletedEvent);
  return true;
}
