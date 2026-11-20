import { ForbiddenException } from '@nestjs/common';
import { formsOfTheSameNumber } from '../whatsapp/a-number-whatsapp-can-reach';

/** What somebody who was removed reads if they open the check-in anyway (fix plan 17 November, group C2). */
export const REMOVED_FROM_THE_CHECK_IN = 'You were removed from this check-in, so you can no longer open it. If that is a mistake, ask the person who runs it.';

/** The same, for somebody who opens an old invitation link of a check-in they were removed from. */
export const REMOVED_FROM_THE_CHECK_IN_BY_LINK = 'You were removed from this check-in, so this link no longer opens it. If that is a mistake, ask the person who runs it.';

/** What the sign-in page reads for an address whose person was removed (run 5, 19 November: it said "I sent a sign-in link", which was not true). */
export const REMOVED_FROM_THE_CHECK_IN_AT_SIGN_IN = 'You were removed from the check-in this address was on, so I did not send a sign-in link. If that is a mistake, ask the person who runs it.';

/**
 * AN ADDRESS THAT BELONGS TO SOMEBODY WHO WAS REMOVED (run 4, 18 November). Removing a person who has no other organisation turns their
 * sign-in off and clears its address, so the sign-in page took their own address for a stranger's and mailed a sign-up link "If this is
 * your first time ...". The check-ins they were removed from still hold the address (`leftAt`), and that is the one place it is known.
 * True only where no live sign-in holds the address and no seat is still held. THE ONE OWNER of "who may no longer be written to or answered"
 * (run 7, 22 November): the mail door, the WhatsApp send door and the WhatsApp inbound path all ask this, by address or by number.
 */
export async function aPersonWhoWasRemoved(
  prisma: any,
  who: string | { email?: string | null; phone?: string | null },
): Promise<boolean> {
  const from = typeof who === 'string' ? { email: who } : who;
  if (!prisma?.groundParticipant?.findFirst || (!from.email && !from.phone)) return false;
  /* An address and a number are one person: the roster and the sign-in hold both, and a removed person's sign-in is turned off but its number stays. */
  const emails = new Set<string>(from.email ? [from.email.trim().toLowerCase()] : []);
  const userIds = new Set<string>();
  if (from.phone) {
    const forms = formsOfTheSameNumber(from.phone);
    const people: any[] = await Promise.resolve(prisma.person?.findMany?.({ where: { phone: { in: forms } }, select: { email: true, linkedUserId: true } })).then((r) => r ?? []).catch(() => []);
    for (const p of people) { if (p.email) emails.add(String(p.email).trim().toLowerCase()); if (p.linkedUserId) userIds.add(p.linkedUserId); }
    const users: any[] = await Promise.resolve(prisma.user?.findMany?.({ where: { phoneNumber: { in: forms } }, select: { id: true } })).then((r) => r ?? []).catch(() => []);
    for (const u of users) userIds.add(u.id);
  }
  const byEmail = emails.size ? [{ email: { in: [...emails], mode: 'insensitive' } }] : [];
  const mine = [...byEmail, ...(userIds.size ? [{ userId: { in: [...userIds] } }] : [])];
  if (!mine.length) return false;
  const left = await Promise.resolve(prisma.groundParticipant.findFirst({ where: { OR: mine, leftAt: { not: null } }, select: { id: true } })).catch(() => null);
  if (!left) return false;
  /* Still here anywhere else: a live sign-in on the address, or a seat that has not been left. Then the mail and the answers go on. */
  const live = await Promise.resolve(prisma.user?.findFirst?.({ where: { OR: [...byEmail, ...(userIds.size ? [{ id: { in: [...userIds] } }] : [])], deletedAt: null, isActive: true }, select: { id: true } })).catch(() => null);
  if (live) return false;
  const seated = await Promise.resolve(prisma.groundParticipant.findFirst({ where: { OR: mine, leftAt: null }, select: { id: true } })).catch(() => null);
  return !seated;
}

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
  const row: any = await Promise.resolve(find.call(prisma!.groundParticipant, { where: { groundId, userId }, select: { awaitingSeat: true, leftAt: true } }))
    .catch(() => ({ awaitingSeat: true }));
  if (row?.leftAt) throw new ForbiddenException(REMOVED_FROM_THE_CHECK_IN);
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

/**
 * WHICH OF THESE CHECK-INS THE READER IS HELD FOR A SEAT ON (privacy row 5, kept by decision 93; second review, new leak A).
 *
 * The lists that read many check-ins at once (the check-in list, Today and You) cannot refuse one by one, so they ask this once and
 * leave those check-ins out whole: nothing of them, no goal, no report sentence, no card. The same fact as `refuseSomeoneHeldForASeat`
 * reads, from the same row. A reader with no user id, or no way to look it up, holds nothing back (as above); a lookup that fails
 * holds every one of them back, the more private answer.
 */
export async function theCheckInsHeldForASeat(
  prisma: { groundParticipant?: { findMany?: (args: any) => unknown }; user?: { findUnique?: (args: any) => unknown } } | null | undefined,
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
  const rows: any[] = await Promise.resolve(find.call(prisma!.groundParticipant, { where: { userId, awaitingSeat: true, groundId: { in: groundIds } }, select: { groundId: true, awaitingSeat: true } }))
    .then((r) => (Array.isArray(r) ? r : []))
    .catch(() => groundIds.map((groundId) => ({ groundId, awaitingSeat: true })));
  return new Set(rows.filter((r) => r?.awaitingSeat !== false && groundIds.includes(r?.groundId)).map((r) => r.groundId));
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
/*
 * AND NOBODY WHO HAS LEFT (fix plan 17 November, group C). Mary was removed on day 28 and the sweeps went on opening her rounds, mailing
 * "Your next check-in is open" and "You've missed your last four check-ins. Lucy will see this", because the filter every sweep spreads asked
 * about seats and approval and never about having left. It is asked here, once, so no sweep has to remember it.
 */
export const NOT_HELD_FOR_A_SEAT = { awaitingSeat: false, leftAt: null, user: { awaitingOrgApproval: false } } as const;

/** What somebody held for a seat who has already answered reads at the top of their own page (decision 110, B3). */
export const HELD_BUT_KEEPS_WHAT_THEY_SAID =
  'There is no seat for you on the plan right now, so you cannot answer a new check-in yet. What you already said and your own report are still yours to read. You will get your invitation as soon as there is a seat.';

/**
 * A PERSON HELD FOR A SEAT WHO HAS ALREADY ANSWERED KEEPS THEIR OWN PAGE (decision 110, B3; privacy row 5 and finding 7).
 *
 * The seat limit stops new participation only. So the check-in page is not refused to somebody who already gave an answer here: it is served
 * narrowed to what is theirs - the check-in's name, its status, their own row and their own sessions - with no colleague, no goal, no shared
 * report, no signal, no setting and no note. Somebody held who never answered is refused as before, with the same sentence. A lookup that fails
 * refuses: the more private answer.
 *
 * Returns true when the reader is held and has answered (so the page must be narrowed), false when they are not held, and throws otherwise.
 */
export async function theHeldPersonWhoHasAnswered(
  prisma: { groundParticipant?: { findFirst?: (args: any) => unknown }; checkIn?: { findFirst?: (args: any) => unknown } } | null | undefined,
  groundId: string | null | undefined,
  userId: string | null | undefined,
): Promise<boolean> {
  const find = prisma?.groundParticipant?.findFirst;
  if (!find || !groundId || !userId) return false;
  const row: any = await Promise.resolve(find.call(prisma!.groundParticipant, { where: { groundId, userId }, select: { id: true, awaitingSeat: true } }))
    .catch(() => ({ awaitingSeat: true }));
  if (row?.awaitingSeat !== true) return false;
  const findAnswer = prisma?.checkIn?.findFirst;
  if (!findAnswer || !row?.id) throw new ForbiddenException(HELD_FOR_A_SEAT);
  const answered: any = await Promise.resolve(findAnswer.call(prisma!.checkIn, { where: { groundId, participantId: row.id, completedAt: { not: null }, isSetup: false }, select: { id: true } }))
    .catch(() => null);
  if (!answered) throw new ForbiddenException(HELD_FOR_A_SEAT);
  return true;
}

/** The page of somebody held for a seat who has answered: only what is theirs, and plainly says why a new session is not open to them. */
export function whatSomeoneHeldForASeatReads(page: Record<string, any>, userId: string): Record<string, any> {
  const mine = (Array.isArray(page.participants) ? page.participants : []).filter((p: any) => p?.userId === userId);
  const myIds = new Set(mine.map((p: any) => p.id));
  return {
    id: page.id,
    label: page.label,
    status: page.status,
    scenario: page.scenario,
    cadence: page.cadence,
    timelineDays: page.timelineDays ?? null,
    runsUntilEnded: page.runsUntilEnded ?? false,
    organizationId: page.organizationId,
    participants: mine,
    checkIns: (Array.isArray(page.checkIns) ? page.checkIns : []).filter((c: any) => myIds.has(c.participantId)),
    objectives: [],
    commitments: [],
    contextItems: [],
    signals: [],
    contextNotes: [],
    settingsChanges: [],
    report: null,
    baseline: null,
    joinToken: null,
    brief: null,
    asks: {},
    viewerIsInitiator: false,
    viewerRunsThisGround: false,
    mayChangeSetup: false,
    heldForASeat: true,
    saying: HELD_BUT_KEEPS_WHAT_THEY_SAID,
  };
}
