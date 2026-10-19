import { theOrganisationsZone, THE_PRODUCTS_OWN_ZONE } from '../../common/the-organisations-own-day';
import { localHour } from '../email/nothing-lands-at-3am';
import { keptOffThePhone } from './a-check-in-kept-off-the-phone';
import { RELEASE_MOMENT_KEY, theMomentIn } from '../grounds/the-release-moment';
import { awayUntilOn, leaveOfThePeopleOn } from '../suites/who-is-away';

/**
 * A CHECK-IN LEFT HALFWAY ON WHATSAPP (Hafsah, 5 October, night: how a check-in ends on WhatsApp).
 *
 * How a check-in ends does not change: Groundwork says when it has what it needs, and the person closes
 * it by writing "finish". What changes is for somebody who stops halfway. Everything they said is kept,
 * as before, and now their phone is told what the app already knew:
 *
 *  1. Once, after three hours of quiet in the day, a reminder to carry on.
 *  2. At eleven hours of quiet, the warning the app already wrote as a turn, "This session closes in 30
 *     minutes if nothing else is said", sent to the phone too.
 *  3. When the clock closes it at twelve hours, that it closed with what they said, and that their report
 *     follows (it does: the clock finishes a session the way a person does, and the report is sent).
 *
 * Only for a session the person was doing on WhatsApp (they wrote on WhatsApp after it began), never for
 * a check-in kept in the app. The sender's own gates hold for all three: "not now" and STOP, the
 * organisation's add-on, the 24 hours, and the one first message of the day (the reminder counts as one;
 * the warning is a closing, so it may be the day's second).
 */
/**
 * NEVER FOR A SESSION THAT BEGAN BEFORE THIS (decision 88: nothing reaches an existing client by surprise).
 * The cut-off is the LATER of this date (the day decision 107 was made) and the release moment the first start
 * of this version wrote (`release.time_running_out_warnings_from`). With that moment missing or unreadable,
 * nothing is sent. A running check-in that began earlier carries on exactly as it was.
 */
export const WHATSAPP_HALFWAY_MESSAGES_FROM = new Date('2026-10-05T00:00:00Z');

/** What a session started on WhatsApp leaves in the send record, kept per check-in: "this person wrote to this check-in here". */
export const ANSWERED_HERE = 'answered-here';

/** The turn the 11-hour sweep injects. It is the app's own warning, not anybody's activity, so no clock restarts at it. */
export const THE_WARNING_TURN = 'This session closes in 30 minutes if nothing else is said. Add anything you still want on the record now.';

/** The last turn that is not the injected warning: the person's or Groundwork's real last word. The 12 hours are counted from it. */
export async function theLastRealTurn(prisma: any, checkInId: string): Promise<{ createdAt: Date; role: string } | null> {
  return (await prisma.conversationTurn.findFirst({
    where: { checkInId, NOT: { role: 'AI', content: THE_WARNING_TURN } },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true, role: true },
  })) ?? null;
}

export const CARRY_ON = 'carry-on';
export const CLOSES_IN_HALF_AN_HOUR = 'closes-in-half-an-hour';
export const CLOSED_BY_THE_CLOCK = 'closed-by-the-clock';

/**
 * Three hours of quiet before the one reminder; only between seven in the morning and eight at night where the organisation is
 * (release plan Part 0: quiet hours are the organisation's; it was Lagos for everybody, so a team in Nairobi was reminded at 9pm).
 */
export const QUIET_BEFORE_THE_REMINDER_MS = 3 * 60 * 60 * 1000;
export function withinTheDay(now: Date, zone: string = THE_PRODUCTS_OWN_ZONE): boolean {
  const h = localHour(now, zone);
  return h >= 7 && h < 20;
}

export function carryOnSaying(firstName: string | null | undefined, label: string, simplerWords?: boolean | null): string {
  if (simplerWords) return `Hi ${firstName?.trim() || 'there'}, your check-in for "${label}" is still open. Everything you have said is saved. Write here to carry on when you are ready.`;
  return `Hi ${firstName?.trim() || 'there'}, your check-in for "${label}" is still open, and everything you have said so far is kept. Reply here to carry on whenever you are ready.`;
}

export function closesInHalfAnHourSaying(label: string, simplerWords?: boolean | null): string {
  if (simplerWords) return `Your check-in for "${label}" will close in 30 minutes if you say nothing more. Add anything you still want saved now.`;
  return `Your check-in for "${label}" closes in 30 minutes if nothing else is said. Add anything you still want on the record now.`;
}

export type WhyTheClockClosedIt = 'quiet' | 'age';
export function closedByTheClockSaying(label: string, simplerWords?: boolean | null, why: WhyTheClockClosedIt = 'quiet'): string {
  const because = why === 'age' ? 'it has been open for two days' : 'nothing was said for twelve hours';
  if (simplerWords) return `Your check-in for "${label}" has closed, because ${because}. Everything you said is saved.`;
  return `Your check-in for "${label}" has closed, because ${because}. Everything you said is kept on the record.`;
}

type Sender = { sendFor: (org: string, phone: string, text: string, context: { checkInId?: string; kind?: string; params?: string[] }) => Promise<{ sent: boolean }> };

/**
 * The person's phone, when this session is one they were doing on WhatsApp and it is not kept in the app.
 * Null otherwise: kept in the app, a number nobody wrote from, a session that began before the cut-off (the later of
 * 5 October 2026 and the release moment, and nothing at all when that moment cannot be read), a session the
 * person never wrote to on WhatsApp, and, for the reminder and the warning, a person on approved leave.
 */
export async function theirPhoneForThisSession(
  prisma: any,
  checkInId: string,
  o: { now?: Date; skipIfAway?: boolean } = {},
): Promise<{ organizationId: string; phone: string; firstName: string | null; label: string; simplerWords: boolean } | null> {
  const now = o.now ?? new Date();
  const ci = await prisma.checkIn?.findUnique?.({
    where: { id: checkInId },
    select: {
      startedAt: true, createdAt: true, groundId: true, participantId: true,
      ground: { select: { organizationId: true, label: true, overWhatsApp: true, simplerWords: true } },
      participant: { select: { email: true, user: { select: { firstName: true, phoneNumber: true, deletedAt: true } } } },
    },
  })?.catch?.(() => null);
  if (!ci?.ground || keptOffThePhone(ci.ground)) return null;
  if (ci.participant?.user?.deletedAt) return null;
  const began = new Date(ci.startedAt ?? ci.createdAt).getTime();
  /* Existing clients: nothing for a session that began before the later of the two dates. */
  const release = theMomentIn(await prisma.platformSetting?.findUnique?.({ where: { key: RELEASE_MOMENT_KEY } })?.catch?.(() => null));
  if (!release) return null;
  if (began < Math.max(WHATSAPP_HALFWAY_MESSAGES_FROM.getTime(), release.getTime())) return null;
  const person = ci.participant?.email
    ? await prisma.person?.findFirst?.({ where: { organizationId: ci.ground.organizationId, email: ci.participant.email, active: true }, select: { phone: true } })?.catch?.(() => null)
    : null;
  const phone = person?.phone ?? ci.participant?.user?.phoneNumber ?? null;
  if (!phone) return null;
  /* They were doing THIS session on WhatsApp: a message of theirs to this check-in went in after it began. */
  const wroteHere = await prisma.whatsAppSend?.findFirst?.({ where: { checkInId, kind: ANSWERED_HERE, createdAt: { gte: new Date(began) } }, select: { id: true } })?.catch?.(() => null);
  if (!wroteHere) return null;
  if (o.skipIfAway && ci.groundId && ci.participantId) {
    const leave = await leaveOfThePeopleOn(prisma, [ci.groundId]).catch(() => null);
    if (!leave || awayUntilOn(leave.get(ci.participantId), now)) return null;
  }
  return { organizationId: ci.ground.organizationId, phone, firstName: ci.participant?.user?.firstName ?? null, label: ci.ground.label, simplerWords: ci.ground.simplerWords === true };
}

/** The one reminder to carry on, when it is due. True when it went. */
export async function remindThemToCarryOn(prisma: any, whatsapp: Sender, checkIn: { id: string; warningFiredAt?: Date | null }, lastTurn: { createdAt: Date; role: string } | null, now: Date): Promise<boolean> {
  /* After the 11-hour warning, nothing is said but the close. */
  if (checkIn.warningFiredAt) return false;
  if (!lastTurn || lastTurn.role !== 'AI') return false;
  const quiet = now.getTime() - new Date(lastTurn.createdAt).getTime();
  if (quiet < QUIET_BEFORE_THE_REMINDER_MS) return false;
  const already = await prisma.whatsAppSend?.findFirst?.({ where: { checkInId: checkIn.id, kind: { startsWith: CARRY_ON } }, select: { id: true } })?.catch?.(() => null);
  if (already) return false;
  const to = await theirPhoneForThisSession(prisma, checkIn.id, { now, skipIfAway: true });
  if (!to) return false;
  if (!withinTheDay(now, (await theOrganisationsZone(prisma, to.organizationId).catch(() => null)) ?? THE_PRODUCTS_OWN_ZONE)) return false;
  return (await whatsapp.sendFor(to.organizationId, to.phone, carryOnSaying(to.firstName, to.label, to.simplerWords), { checkInId: checkIn.id, kind: CARRY_ON })).sent;
}

/** The thirty-minute warning, to the phone as well as on the record. */
export async function warnTheirPhone(prisma: any, whatsapp: Sender, checkInId: string, now: Date = new Date()): Promise<boolean> {
  const to = await theirPhoneForThisSession(prisma, checkInId, { now, skipIfAway: true });
  if (!to) return false;
  return (await whatsapp.sendFor(to.organizationId, to.phone, closesInHalfAnHourSaying(to.label, to.simplerWords), { checkInId, kind: CLOSES_IN_HALF_AN_HOUR })).sent;
}

/**
 * Closed by the clock: say so, with the true reason, before the report follows. Said once: if a message about this
 * close was ever recorded (sent or not), nothing more goes, so a close that fails and is tried again does not
 * message the person twice. There is no leave check here: it answers a session they had open.
 */
export async function tellThemTheClockClosedIt(prisma: any, whatsapp: Sender, checkInId: string, why: WhyTheClockClosedIt = 'quiet'): Promise<boolean> {
  const already = await prisma.whatsAppSend?.findFirst?.({ where: { checkInId, kind: { startsWith: CLOSED_BY_THE_CLOCK } }, select: { id: true } })?.catch?.(() => null);
  if (already) return false;
  const to = await theirPhoneForThisSession(prisma, checkInId);
  if (!to) return false;
  return (await whatsapp.sendFor(to.organizationId, to.phone, closedByTheClockSaying(to.label, to.simplerWords, why), { checkInId, kind: CLOSED_BY_THE_CLOCK })).sent;
}
