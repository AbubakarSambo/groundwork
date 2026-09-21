import { CheckInStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AN_ANSWER } from '../grounds/an-answer-includes-a-refusal';
import { waitsOnAManagingOnlyLead } from '../grounds/the-lead-who-only-asks';

/**
 * "N OF M ANSWERED", COMPUTED ONCE.
 *
 * It was computed independently in eight places over four different denominators - everybody, the
 * non-managing-only, raw COMPLETED rows against a head count, and so on - so the same session read
 * "3 of 4" on one screen and "3 of 5" on the next. This is the one definition: the population is the
 * one the release rule waits on (isSessionReadyForReport - everybody gives a first check-in, and from
 * session two a managing-only lead is not waited on; somebody still holding a live invitation is
 * expected), and "answered" is what an-answer-includes-a-refusal.ts says it is.
 */
export interface HowManyHaveAnswered {
  answered: number;
  expected: number;
  /** Participant ids still expected. Names are the caller's business; this file knows none. */
  waitingOn: string[];
  /** Of those who answered, how many gave an account (COMPLETED) rather than declining. */
  completed: number;
}

export async function howManyHaveAnswered(prisma: PrismaService, groundId: string, sessionNumber: number): Promise<HowManyHaveAnswered> {
  /* And a lead who only asks is not waited on at all - see the-lead-who-only-asks. */
  const ground = await prisma.ground.findUnique({ where: { id: groundId }, select: { scenario: true } });
  const expected = await prisma.groundParticipant.findMany({
    where: {
      groundId,
      ...(waitsOnAManagingOnlyLead(ground?.scenario, sessionNumber) ? {} : { managingOnly: false }),
      OR: [
        { userId: { not: null } },
        { checkIns: { some: { sessionNumber, status: { in: AN_ANSWER } } } },
        { userId: null, invitedAt: { not: null }, inviteTokenExpiresAt: { gt: new Date() } },
      ],
    },
    select: { id: true, checkIns: { where: { sessionNumber, status: { in: AN_ANSWER } }, select: { status: true } } },
  });
  const answeredRows = expected.filter((p) => p.checkIns.length > 0);
  return {
    answered: answeredRows.length,
    expected: expected.length,
    waitingOn: expected.filter((p) => p.checkIns.length === 0).map((p) => p.id),
    completed: answeredRows.filter((p) => p.checkIns.some((c) => c.status === CheckInStatus.COMPLETED)).length,
  };
}
