import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CheckInStatus, PartyType } from '@prisma/client';
import { A_GROUND_IS_HELD, A_GROUND_IS_OVER, A_GROUND_HAS_STOPPED, WHILE_IT_IS_HELD } from './a-ground-that-has-ended';

/**
 * "CHECK IN YOURSELF" (decision 133, change 6).
 *
 * After their first check-in the lead checks in when they choose, so nothing is scheduled for them.
 * This opens one for them on demand, any time the check-in is running: an open one of theirs is used
 * again, otherwise a new one is made for the round the team is on (or the next number, when they
 * already checked in this round). It is marked optional, so it is never counted as missed.
 *
 * Works the same for a lead who chose "only the team" before (managingOnly): the same way back in.
 */
export const ONLY_THE_LEAD_CHECKS_IN_HERE = 'Only the person who runs this check-in can use Check in yourself.';
export const THIS_CHECK_IN_HAS_ENDED = 'This check-in has ended, so there is nothing more to check in to.';
export const THIS_CHECK_IN_HAS_STOPPED = 'This check-in has stopped. Give it more time on People and setup before you check in again.';

export async function openTheLeadsCheckIn(prisma: any, groundId: string, organizationId: string | null | undefined, userId: string) {
  const ground = await prisma.ground.findUnique({ where: { id: groundId }, select: { id: true, status: true, initiatorId: true, organizationId: true } });
  if (!ground || (organizationId && ground.organizationId && ground.organizationId !== organizationId)) {
    throw new NotFoundException('That check-in could not be found.');
  }
  if (ground.initiatorId !== userId) throw new ForbiddenException(ONLY_THE_LEAD_CHECKS_IN_HERE);
  if (A_GROUND_IS_OVER.includes(ground.status)) throw new BadRequestException(THIS_CHECK_IN_HAS_ENDED);
  if (A_GROUND_HAS_STOPPED.includes(ground.status)) throw new BadRequestException(THIS_CHECK_IN_HAS_STOPPED);
  if (A_GROUND_IS_HELD.includes(ground.status)) throw new BadRequestException(WHILE_IT_IS_HELD);

  const lead = await prisma.groundParticipant.findFirst({ where: { groundId, userId, partyType: PartyType.INITIATOR }, select: { id: true } });
  if (!lead) throw new ForbiddenException(ONLY_THE_LEAD_CHECKS_IN_HERE);

  const open = await prisma.checkIn.findFirst({
    where: { participantId: lead.id, status: { in: [CheckInStatus.NOT_STARTED, CheckInStatus.IN_PROGRESS] } },
    orderBy: { sessionNumber: 'asc' },
    select: { id: true, sessionNumber: true },
  });
  if (open) return { checkInId: open.id, sessionNumber: open.sessionNumber, opened: false };

  const theTeams = await prisma.checkIn.aggregate({ where: { groundId, isSetup: false }, _max: { sessionNumber: true } });
  const mine = await prisma.checkIn.aggregate({ where: { participantId: lead.id }, _max: { sessionNumber: true } });
  const round = Math.max(theTeams?._max?.sessionNumber ?? 1, (mine?._max?.sessionNumber ?? 0) + 1);
  const made = await prisma.checkIn.create({
    data: { groundId, participantId: lead.id, sessionNumber: round, status: CheckInStatus.NOT_STARTED, optional: true },
    select: { id: true, sessionNumber: true },
  });
  return { checkInId: made.id, sessionNumber: made.sessionNumber, opened: true };
}
