import { ForbiddenException } from '@nestjs/common';

/** What somebody held for a seat reads if they open the link anyway (U.4 re-review). */
export const HELD_FOR_A_SEAT = 'This check-in cannot start for you yet, because there is no seat for you on the plan. You will get your invitation as soon as there is one.';

/**
 * NOBODY HELD FOR A SEAT READS ANYTHING OF THE CHECK-IN (privacy sweep, 5 October 2026, finding 3; privacy row 5, kept by decision 93).
 *
 * The schema promises it for `awaitingSeat`: "Nothing reaches the person until then." Only the invitation page kept it. Someone held for
 * a seat who had a sign-in read the board, the reports and a colleague's words. Every read of a check-in asks this first, before it looks
 * anything else up, and answers one sentence, the one the invitation page already gives. The same refusal for everyone held, so it says
 * nothing about the check-in itself.
 *
 * A lookup that fails refuses too: the more private answer when the fact cannot be read.
 */
export async function refuseSomeoneHeldForASeat(
  prisma: { groundParticipant?: { findFirst?: (args: any) => unknown } } | null | undefined,
  groundId: string | null | undefined,
  userId: string | null | undefined,
): Promise<void> {
  const find = prisma?.groundParticipant?.findFirst;
  if (!find || !groundId || !userId) return;
  const row: any = await Promise.resolve(find.call(prisma!.groundParticipant, { where: { groundId, userId }, select: { awaitingSeat: true } }))
    .catch(() => ({ awaitingSeat: true }));
  if (row?.awaitingSeat === true) throw new ForbiddenException(HELD_FOR_A_SEAT);
}

/**
 * NOBODY WAITING FOR THE ORGANISATION'S APPROVAL READS THE CHECK-IN PAGE OR THE WEEKLY REPORT (privacy row 5, kept by decision 93).
 *
 * Someone not yet let into the organisation is held like someone held for a seat. The board and the reports already turned them away;
 * the check-in page and the weekly report did not. Asked first, with the sentence the same person is given elsewhere. A lookup that
 * fails refuses too.
 */
export async function refuseSomeoneAwaitingTheOrganisation(
  prisma: { user?: { findUnique?: (args: any) => unknown } } | null | undefined,
  userId: string | null | undefined,
  sentence: string,
): Promise<void> {
  const find = prisma?.user?.findUnique;
  if (!find || !userId) return;
  const me: any = await Promise.resolve(find.call(prisma!.user, { where: { id: userId }, select: { awaitingOrgApproval: true } }))
    .catch(() => ({ awaitingOrgApproval: true }));
  if (me?.awaitingOrgApproval === true) throw new ForbiddenException(sentence);
}
