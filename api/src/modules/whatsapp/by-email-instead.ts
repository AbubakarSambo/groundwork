import { aRoutineWhatsApp } from '../engagement/one-routine-message-a-day';
import { OUTSIDE_THE_WINDOW } from './a-message-outside-the-window';
import { FIRST_CONTACT_NOT_APPROVED } from './the-first-message-to-a-number';

/**
 * WHEN WHATSAPP CANNOT TAKE A MESSAGE, THE SAME MESSAGE GOES BY EMAIL INSTEAD (Hafsah, 19 October, point 2; docs/whatsapp-templates.md,
 * "Until they're approved": email instead, not both).
 *
 * In the messages test of 19 October, 34 WhatsApp messages were written down as "not sent" because they fell outside the 24 hours and
 * no approved template existed for them. In production they would have vanished: Grace, Mercy, Joseph, Amos, Wanjiru, Brian, Aisha,
 * Njeri and David each finished a check-in and heard nothing. Now the same words go by email, to the same person:
 *  - only when WhatsApp could not take it for that reason (outside the 24 hours with no approved template, or the very first message
 *    to a number before groundwork_first_contact is approved). A STOP, a "Not now", the day's one message or quiet hours hold it as
 *    before, and nothing goes by email for them;
 *  - never where the message already has an email of its own when WhatsApp fails (the lead's summary, a request waiting or decided);
 *  - one channel per opening: an opening that already went by email for this check-in is not emailed again;
 *  - once for one message: the report and its retry are one message, and a check-in's thank-you is said once;
 *  - and through the one door every email goes through, so one routine message a day, quiet hours and the person's own wishes all hold.
 * Applies to everyone: it replaces a message that today silently fails.
 */

/** The reasons WhatsApp gives for a message it could not take, where the person is owed it by email. */
export function whatsAppCouldNotTakeIt(because: string | null | undefined): boolean {
  return because === OUTSIDE_THE_WINDOW || because === FIRST_CONTACT_NOT_APPROVED;
}

/** Messages that already go by email, by their own sender, when WhatsApp does not take them: never a second email. */
export const ALREADY_GO_BY_EMAIL: ReadonlySet<string> = new Set(['lead-summary', 'request-waiting', 'requests-waiting', 'request-decided']);
/** A check-in opening: told once, on one channel. */
export const AN_OPENING: ReadonlySet<string> = new Set(['checkin-open', 'checkin-catch-up']);
/** The emails that open a check-in for a person. */
export const THE_OPENING_EMAILS = ['sendParticipantInvite', 'sendSessionReady', 'sendYouAreInNow'];
/** What follows something the person did themselves: their own answer and their own report. */
const AFTER_THEIR_OWN = new Set(['report', 'report-retry', 'report-thanks']);

/** The email's sender, so the one door knows what kind of mail it is: the day's routine message, a notice, or the answer to their own check-in. */
export const BY_EMAIL_ROUTINE = 'sendTheRoutineMessageByEmail';
export const BY_EMAIL_NOTICE = 'sendTheMessageByEmail';
export const BY_EMAIL_AFTER_THEIR_OWN = 'sendTheAnswerByEmail';
export function theSenderFor(kind: string): string {
  if (AFTER_THEIR_OWN.has(kind)) return BY_EMAIL_AFTER_THEIR_OWN;
  return aRoutineWhatsApp(kind) ? BY_EMAIL_ROUTINE : BY_EMAIL_NOTICE;
}

/** The report and its retry are one message, and so are the opening and its catch-up. */
export const oneMessage = (kind: string) => (kind === 'report-retry' ? 'report' : kind === 'checkin-catch-up' ? 'checkin-open' : kind);

/**
 * THE SAME WORDS, TRUE IN AN EMAIL. A WhatsApp message says "you can answer right here" and "Reply START to begin", which are not true
 * of an email: those few phrases are said the way an email says them, and nothing else is changed.
 */
export function theWordsForAnEmail(text: string): string {
  return String(text ?? '')
    .replace(/,? and you can answer right here\./gi, ', and you can answer it in Groundwork.')
    .replace(/\bso you can answer here now\b/gi, 'so you can answer it in Groundwork now')
    .replace(/\b([Yy])ou can answer here\b/g, '$1ou can answer it in Groundwork')
    .replace(/ Reply here when it opens and we'll begin\./g, ' You can answer it in Groundwork when it opens.')
    .replace(/ You will hear here when /g, ' You will be told when ')
    .replace(/\s*Reply START to begin\./g, '')
    .replace(/\s*Reply STOP to stop these messages\./g, '')
    .replace(/\s*Not you\? Reply STOP\./g, '')
    .replace(/\s*If you would rather not hear from us here again today, reply "not now"\./g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

/** The subject: the message's own first sentence, without its full stop. */
export function theSubjectFor(text: string): string {
  const firstSentence = (String(text ?? '').split(/(?<=[.!?])\s+/)[0] ?? '').trim().replace(/[.!]+$/, '');
  if (firstSentence.length <= 110) return firstSentence;
  return `${firstSentence.slice(0, 109).replace(/\s+\S*$/, '')}…`;
}

/** The key that says this message went by email once. */
export function theOnceKey(kind: string, checkInId: string | null | undefined, to: string, now: Date): string {
  const day = now.toISOString().slice(0, 10);
  return checkInId ? `whatsapp-by-email.${checkInId}.${oneMessage(kind)}` : `whatsapp-by-email.${to}.${oneMessage(kind)}.${day}`;
}
