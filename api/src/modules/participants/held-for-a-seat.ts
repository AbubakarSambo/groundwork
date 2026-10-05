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
  prisma: { groundParticipant?: { findFirst?: (args: any) => unknown }; checkIn?: { findFirst?: (args: any) => unknown } } | null | undefined,
  groundId: string | null | undefined,
  userId: string | null | undefined,
): Promise<void> {
  const find = prisma?.groundParticipant?.findFirst;
  if (!find || !groundId || !userId) return;
  const row: any = await Promise.resolve(find.call(prisma!.groundParticipant, { where: { groundId, userId }, select: { id: true, awaitingSeat: true } }))
    .catch(() => ({ awaitingSeat: true }));
  if (row?.awaitingSeat !== true) return;
  /* Held, but already answered: keeps reading what they earned (6 October 2026, Finding 7; Hafsah to confirm). */
  if (row?.id && (await hasAlreadyAnswered(prisma, [row.id])).size) return;
  throw new ForbiddenException(HELD_FOR_A_SEAT);
}

/**
 * WHO, OF THESE HELD PARTICIPANTS, HAS ALREADY COMPLETED A SESSION (6 October 2026, Finding 7; Hafsah to confirm).
 *
 * The hold stops new sessions, reminders and invitations. It does not take back what somebody already earned by answering: on the
 * live line they read the board, the report and the check-in page, and 41 people on 20 check-ins did before the hold was enforced
 * on reads. Somebody held who never answered stays refused. The more private answer when the lookup fails: nobody is let through.
 */
async function hasAlreadyAnswered(prisma: { checkIn?: { findMany?: (args: any) => unknown; findFirst?: (args: any) => unknown } } | null | undefined, participantIds: string[]): Promise<Set<string>> {
  if (!participantIds.length) return new Set();
  const findMany = prisma?.checkIn?.findMany;
  if (!findMany) return new Set();
  const rows: any[] = await Promise.resolve(findMany.call(prisma!.checkIn, { where: { participantId: { in: participantIds }, status: 'COMPLETED' }, select: { participantId: true } }))
    .then((r) => (Array.isArray(r) ? r : []))
    .catch(() => []);
  return new Set(rows.map((r) => r?.participantId).filter(Boolean));
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

/**
 * WHICH OF THESE CHECK-INS THE READER IS HELD FOR A SEAT ON (privacy row 5, kept by decision 93; second review, new leak A).
 *
 * The lists that read many check-ins at once (the check-in list, Today and You) cannot refuse one by one, so they ask this once and
 * leave those check-ins out whole: nothing of them, no goal, no report sentence, no card. The same fact as `refuseSomeoneHeldForASeat`
 * reads, from the same row. A reader with no user id, or no way to look it up, holds nothing back (as above); a lookup that fails
 * holds every one of them back, the more private answer.
 */
export async function theCheckInsHeldForASeat(
  prisma: { groundParticipant?: { findMany?: (args: any) => unknown }; checkIn?: { findMany?: (args: any) => unknown }; user?: { findUnique?: (args: any) => unknown } } | null | undefined,
  groundIds: string[],
  userId: string | null | undefined,
): Promise<Set<string>> {
  const find = prisma?.groundParticipant?.findMany;
  if (!find || !userId || !groundIds.length) return new Set();
  /* SOMEONE WAITING FOR THE ORGANISATION'S APPROVAL IS HELD ON EVERY ONE OF THEM (row 5, kept by decision 93): the same hold, from the person's own row. */
  const findUser = prisma?.user?.findUnique;
  if (findUser) {
    const me: any = await Promise.resolve(findUser.call(prisma!.user, { where: { id: userId }, select: { awaitingOrgApproval: true } })).catch(() => ({ awaitingOrgApproval: true }));
    if (me?.awaitingOrgApproval === true) return new Set(groundIds);
  }
  const rows: any[] = await Promise.resolve(find.call(prisma!.groundParticipant, { where: { userId, awaitingSeat: true, groundId: { in: groundIds } }, select: { id: true, groundId: true, awaitingSeat: true } }))
    .then((r) => (Array.isArray(r) ? r : []))
    .catch(() => groundIds.map((groundId) => ({ groundId, awaitingSeat: true })));
  const held = rows.filter((r) => r?.awaitingSeat !== false && groundIds.includes(r?.groundId));
  /* Held, but already answered in that check-in: still reads it (Finding 7). */
  const answered = await hasAlreadyAnswered(prisma as any, held.map((r) => r.id).filter(Boolean));
  return new Set(held.filter((r) => !(r.id && answered.has(r.id))).map((r) => r.groundId));
}

/**
 * THE SAME FACT, AS A FILTER, FOR EVERY SWEEP THAT WRITES TO PEOPLE (second review, new leak C; privacy row 5, kept by decision 93).
 *
 * Nobody held for a seat is sent a reminder, a nudge, a summary or an announcement about the check-in: it has not started for them,
 * and what it says ("is overdue") is not true of somebody who has not been invited. Spread into the `participant` filter of a sweep.
 *
 * Somebody waiting for the organisation to let them in (row 5) is left out the same way: they cannot open or answer the check-in yet.
 * Every sweep already asks for `userId: { not: null }`, so the sign-in is there to ask about.
 */
export const NOT_HELD_FOR_A_SEAT = { awaitingSeat: false, user: { awaitingOrgApproval: false } } as const;
