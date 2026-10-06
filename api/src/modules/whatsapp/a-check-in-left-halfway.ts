import { keptOffThePhone } from './a-check-in-kept-off-the-phone';

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
 * Decision 90 says no organisation used WhatsApp before this release, so no earlier session can have been
 * done on WhatsApp and none could qualify below anyway; this is the second lock on the same door, the date
 * decision 107 was made. A running check-in that began earlier carries on exactly as it was.
 */
export const WHATSAPP_HALFWAY_MESSAGES_FROM = new Date('2026-10-05T00:00:00Z');
export const CARRY_ON = 'carry-on';
export const CLOSES_IN_HALF_AN_HOUR = 'closes-in-half-an-hour';
export const CLOSED_BY_THE_CLOCK = 'closed-by-the-clock';

/** Three hours of quiet before the one reminder; only between seven in the morning and eight at night in Lagos. */
export const QUIET_BEFORE_THE_REMINDER_MS = 3 * 60 * 60 * 1000;
const LAGOS_OFFSET_HOURS = 1;
export function withinTheDay(now: Date): boolean {
  const h = (now.getUTCHours() + LAGOS_OFFSET_HOURS) % 24;
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

export function closedByTheClockSaying(label: string, simplerWords?: boolean | null): string {
  if (simplerWords) return `Your check-in for "${label}" has closed, because nothing was said for twelve hours. Everything you said is saved. Your report will come in a moment.`;
  return `Your check-in for "${label}" has closed, because nothing was said for twelve hours. Everything you said is kept on the record, and your report follows in a moment.`;
}

type Sender = { sendFor: (org: string, phone: string, text: string, context: { checkInId?: string; kind?: string; params?: string[] }) => Promise<{ sent: boolean }> };

/**
 * The person's phone, when this session is one they were doing on WhatsApp and it is not kept in the app.
 * Null otherwise.
 */
export async function theirPhoneForThisSession(prisma: any, checkInId: string): Promise<{ organizationId: string; phone: string; firstName: string | null; label: string; simplerWords: boolean } | null> {
  const ci = await prisma.checkIn?.findUnique?.({
    where: { id: checkInId },
    select: {
      startedAt: true, createdAt: true,
      ground: { select: { organizationId: true, label: true, overWhatsApp: true, simplerWords: true } },
      participant: { select: { email: true, user: { select: { firstName: true, phoneNumber: true, deletedAt: true } } } },
    },
  })?.catch?.(() => null);
  if (!ci?.ground || keptOffThePhone(ci.ground)) return null;
  if (ci.participant?.user?.deletedAt) return null;
  const person = ci.participant?.email
    ? await prisma.person?.findFirst?.({ where: { organizationId: ci.ground.organizationId, email: ci.participant.email, active: true }, select: { phone: true, whatsappLastInboundAt: true } })?.catch?.(() => null)
    : null;
  const phone = person?.phone ?? ci.participant?.user?.phoneNumber ?? null;
  if (!phone) return null;
  /* They were doing this session on WhatsApp: they wrote there after it began. */
  const began = new Date(ci.startedAt ?? ci.createdAt).getTime();
  if (began < WHATSAPP_HALFWAY_MESSAGES_FROM.getTime()) return null;
  if (!person?.whatsappLastInboundAt || new Date(person.whatsappLastInboundAt).getTime() < began) return null;
  return { organizationId: ci.ground.organizationId, phone, firstName: ci.participant?.user?.firstName ?? null, label: ci.ground.label, simplerWords: ci.ground.simplerWords === true };
}

/** The one reminder to carry on, when it is due. True when it went. */
export async function remindThemToCarryOn(prisma: any, whatsapp: Sender, checkIn: { id: string }, lastTurn: { createdAt: Date; role: string } | null, now: Date): Promise<boolean> {
  if (!lastTurn || lastTurn.role !== 'AI') return false;
  const quiet = now.getTime() - new Date(lastTurn.createdAt).getTime();
  if (quiet < QUIET_BEFORE_THE_REMINDER_MS || !withinTheDay(now)) return false;
  const already = await prisma.whatsAppSend?.findFirst?.({ where: { checkInId: checkIn.id, kind: { startsWith: CARRY_ON } }, select: { id: true } })?.catch?.(() => null);
  if (already) return false;
  const to = await theirPhoneForThisSession(prisma, checkIn.id);
  if (!to) return false;
  return (await whatsapp.sendFor(to.organizationId, to.phone, carryOnSaying(to.firstName, to.label, to.simplerWords), { checkInId: checkIn.id, kind: CARRY_ON })).sent;
}

/** The thirty-minute warning, to the phone as well as on the record. */
export async function warnTheirPhone(prisma: any, whatsapp: Sender, checkInId: string): Promise<boolean> {
  const to = await theirPhoneForThisSession(prisma, checkInId);
  if (!to) return false;
  return (await whatsapp.sendFor(to.organizationId, to.phone, closesInHalfAnHourSaying(to.label, to.simplerWords), { checkInId, kind: CLOSES_IN_HALF_AN_HOUR })).sent;
}

/** Closed by the clock: say so, before the report follows. Read before the session is closed, because closing clears nothing it needs. */
export async function tellThemTheClockClosedIt(prisma: any, whatsapp: Sender, checkInId: string): Promise<boolean> {
  const to = await theirPhoneForThisSession(prisma, checkInId);
  if (!to) return false;
  return (await whatsapp.sendFor(to.organizationId, to.phone, closedByTheClockSaying(to.label, to.simplerWords), { checkInId, kind: CLOSED_BY_THE_CLOCK })).sent;
}
