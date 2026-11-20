import { A_GROUND_NO_MESSAGE_IS_ABOUT } from '../grounds/a-ground-that-has-ended';
import { FIRST_MESSAGES, OPENING_OR_CLOSING } from '../whatsapp/a-message-outside-the-window';
import { formsOfTheSameNumber } from '../whatsapp/a-number-whatsapp-can-reach';

/**
 * ONE ROUTINE MESSAGE A PERSON A DAY, ACROSS EMAIL AND WHATSAPP TOGETHER (decision 109, item 6; engagement spec section 26 and 33).
 *
 * Email had no count at all, and WhatsApp kept its own (`howOftenToday`), so a person could be chased by both on one morning. A person is
 * one person: the count is theirs, whichever door the message used. A ROUTINE message is one Groundwork decided to send this morning, with
 * nobody having asked for it. The exceptions are written down here, by name, and are never counted and never held:
 *
 *   - an approval waiting for somebody (decisions 13, 83 and 92 already say so);
 *   - a check-in opening or closing for them (the session is ready, the time is running out, it ran out, it was reopened);
 *   - everything somebody asked for, which is not routine at all (a report they took part in, an invitation, a sign-in link);
 *   - what is about the running of the product for an admin (a dying webhook).
 *
 * The day is the UTC day, as WhatsApp's count always was. What was held back is not written down as sent. Whether it is tried again is the sender's:
 * the sweeps that stamp nothing until it went (this week's messages, the test and what-is-new emails) try again on another day. The ones that are
 * events, or that must not be late, are NOT in the list below and so are never held: an invitation about to lapse, a code about to expire, the lead's
 * weekly letter (on a Friday it outranks the WhatsApp summary of the morning), and a participant being blocked.
 */
export const ROUTINE_EMAILS: ReadonlySet<string> = new Set([
  'sendNudge', 'sendAbsenceReminder', 'sendActivationReminder', 'sendFeedbackRequest',
  'sendRoundDigest', 'sendTestCheckInMovesOn', 'sendHeresWhatIsNew', 'sendYourWeek', 'sendLeadFirstCheckIn', 'sendTheReportFollowUp', 'sendWhoHasGoneQuiet', 'sendWaitingOnThePeople', 'sendWhoHasNotStarted', 'sendTheLeadsDailyNudge', 'sendMissedCheckIns',
  /* The free month's reminder to an admin (15 October): Groundwork decides to send it, so it is the day's one. Not the four weeks'
     countdown after it (sendGroundworkPausesSoon, 2 November): a day's email held to another day would say the wrong number of days. */
  'sendFreeMonthEndsSoon',
  /* The day's routine WhatsApp message, by email when WhatsApp could not take it (whatsapp/by-email-instead.ts): still the day's one. */
  'sendTheRoutineMessageByEmail',
  /* The year-end progress note (Fatima, increment 4): only when something meaningful is new, and then still the day's one. */
  'sendTheYearEndProgress',
  /* Not 'sendTimeRunningOut' (Release 1, pull request 5): "runs out in 7 days" is the only warning before a check-in is stalled, and the
     summary's lines can be cut for room, so it stays an email of its own rather than waiting for the summary and folding into it
     (docs/release-questions.md). It never holds the summary back: the summary is never held by the day's count. */
]);

/**
 * THE LEAD'S DAILY SUMMARY WINS (standing decision, 18 October 2026; Drop Access run 1, items 16 and 24). For somebody who runs a check-in,
 * the morning summary is the one routine message of the day. Routine mail to her asked for before the summary's hour waits until just after
 * it, and then goes only if the summary did not (one a day), so "session 8 is complete" or "runs out in 7 days" can never take the
 * summary's place. What they said is in the summary: what needs her, what is late, and the risks, the end of the check-in among them.
 * Approvals and security mail are not routine and are never held by this. The summary itself is never held back by the day's count.
 */
export const THE_SUMMARY_SENDERS: ReadonlySet<string> = new Set(['sendTheLeadsDailyNudge']);
/** Whether this address runs a check-in that is still going: the person whose morning summary routine mail waits for. */
export async function theyRunACheckIn(prisma: any, email: string): Promise<boolean> {
  const one = await Promise.resolve(prisma?.ground?.findFirst?.({
    where: { initiator: { email: { equals: String(email ?? '').trim(), mode: 'insensitive' } }, status: { notIn: A_GROUND_NO_MESSAGE_IS_ABOUT } },
    select: { id: true },
  })).catch(() => null);
  return !!one;
}

/** The summary goes at 9am in Lagos (grounds.cron.ts, sendTheLeadsDailyNudges); routine mail to a lead waits until half an hour after. */
export function justAfterTheSummary(now: Date): Date {
  const lagos = new Date(now.getTime() + 60 * 60 * 1000);
  const at = new Date(Date.UTC(lagos.getUTCFullYear(), lagos.getUTCMonth(), lagos.getUTCDate(), 8, 30));
  return at;
}

/** A WhatsApp message Groundwork writes first that is the day's routine one: every first message except a check-in opening or closing. */
export function aRoutineWhatsApp(kind: string | null | undefined): boolean {
  const base = (kind ?? '').split(':')[0];
  return !!base && FIRST_MESSAGES.has(base) && !OPENING_OR_CLOSING.has(base);
}

export const THEY_HAD_ONE_TODAY = 'They have already been sent one routine message today, by email or on WhatsApp, and one a day is the most Groundwork sends.';

const startOfTheDay = (now: Date) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

/** Every email address and number this person is known by, from the rosters they are on, starting from either one. */
export async function whoTheyAre(prisma: any, from: { email?: string | null; phone?: string | null }): Promise<{ emails: string[]; phones: string[] }> {
  const emails = new Set<string>(from.email ? [from.email.trim().toLowerCase()] : []);
  const phones = new Set<string>(from.phone ? formsOfTheSameNumber(from.phone) : []);
  /* A number kept only on the sign-in, with no roster row, is still this person's: the account links the address and the number. */
  const users = prisma?.user?.findMany;
  if (users) {
    const or: any[] = [];
    if (from.email) or.push({ email: { equals: from.email.trim(), mode: 'insensitive' } });
    if (from.phone) or.push({ phoneNumber: { in: formsOfTheSameNumber(from.phone) } });
    if (or.length) {
      const rows: any[] = await Promise.resolve(users.call(prisma.user, { where: { OR: or }, select: { email: true, phoneNumber: true } })).catch(() => []);
      for (const r of Array.isArray(rows) ? rows : []) {
        if (r.email) emails.add(String(r.email).trim().toLowerCase());
        if (r.phoneNumber) formsOfTheSameNumber(String(r.phoneNumber)).forEach((f) => phones.add(f));
      }
    }
  }
  const find = prisma?.person?.findMany;
  if (find) {
    const or: any[] = [];
    if (from.email) or.push({ email: { equals: from.email.trim(), mode: 'insensitive' } });
    if (from.phone) or.push({ phone: { in: formsOfTheSameNumber(from.phone) } });
    if (or.length) {
      const rows: any[] = await Promise.resolve(find.call(prisma.person, { where: { OR: or }, select: { email: true, phone: true } })).catch(() => []);
      for (const r of Array.isArray(rows) ? rows : []) {
        if (r.email) emails.add(String(r.email).trim().toLowerCase());
        if (r.phone) formsOfTheSameNumber(String(r.phone)).forEach((f) => phones.add(f));
      }
    }
  }
  return { emails: [...emails], phones: [...phones] };
}

/** How many routine messages this person has been sent today, by each door. Counts only what went. A lookup that fails counts nothing: the message is not lost for it. */
export async function theirRoutineMessagesToday(prisma: any, from: { email?: string | null; phone?: string | null }, now: Date = new Date()): Promise<{ email: number; whatsapp: number }> {
  const them = await whoTheyAre(prisma, from);
  const today = startOfTheDay(now);
  const emailRows: any[] = them.emails.length && prisma?.notification?.findMany
    ? await Promise.resolve(prisma.notification.findMany({
        where: { channel: 'email', outcome: 'sent', createdAt: { gte: today }, toAddress: { in: them.emails }, sender: { in: [...ROUTINE_EMAILS] } },
        select: { sender: true },
      })).catch(() => [])
    : [];
  const whatsappRows: any[] = them.phones.length && prisma?.whatsAppSend?.findMany
    ? await Promise.resolve(prisma.whatsAppSend.findMany({
        where: { phone: { in: them.phones }, createdAt: { gte: today }, sentAt: { not: null } },
        select: { kind: true },
      })).catch(() => [])
    : [];
  return {
    email: (Array.isArray(emailRows) ? emailRows : []).length,
    whatsapp: (Array.isArray(whatsappRows) ? whatsappRows : []).filter((r) => aRoutineWhatsApp(r.kind)).length,
  };
}
