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
  'sendNudge', 'sendAbsenceReminder', 'sendActivationReminder', 'sendActivationRevealReminder', 'sendFeedbackRequest',
  'sendRoundDigest', 'sendTestCheckInMovesOn', 'sendHeresWhatIsNew', 'sendYourWeek', 'sendLeadFirstCheckIn',
]);

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
