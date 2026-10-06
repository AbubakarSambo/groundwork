import { TEMPLATES, fill, oneLine } from '../whatsapp/a-message-outside-the-window';
import { theQueueSaid, type TheQueue } from './the-approvals-queue.service';

/**
 * WHAT WAITS FOR AN APPROVER, SAID ONCE (suites at scale: "an approver with 30 waiting gets one summary, not 30 messages").
 *
 * A request on its own still goes to its approver straight away (decision 92). When there are two or more waiting, each new one
 * says nothing, and the approver is written to once, in the morning, or once when many were passed on to them at the same moment:
 * how many, how many of each, how long the oldest has waited, and how many have waited longer than the organisation allows. It goes
 * on WhatsApp when it can, and by email when it cannot, so it is one message and not both. What it never holds: a name, an amount,
 * a date or a word anybody wrote. Those are in the app.
 *
 * QUIET HOURS. Groundwork does not write to an approver between eight in the evening and seven in the morning in Lagos, where the
 * boards are dated. A summary that would go then waits for the morning.
 */

export const QUIET_FROM_HOUR = 20;
export const QUIET_UNTIL_HOUR = 7;

/** The hour it is in Lagos, which has no daylight saving. */
export const lagosHour = (now: Date) => Number(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hourCycle: 'h23', timeZone: 'Africa/Lagos' }).format(now));

export function itIsQuietNow(now: Date = new Date()): boolean {
  const h = lagosHour(now);
  return h >= QUIET_FROM_HOUR || h < QUIET_UNTIL_HOUR;
}

/** One paragraph, in full sentences: "Seven requests are waiting for you to approve or decline: three for leave and four to spend. The oldest has waited 7 working days." */
export function theSummaryParagraph(counts: TheQueue['counts'], oldestWorkingDays: number): string {
  const oldest = oldestWorkingDays >= 1 ? ` The oldest has waited ${oldestWorkingDays} working ${oldestWorkingDays === 1 ? 'day' : 'days'}.` : '';
  /* theQueueSaid ends with the sentence about the deadline when some are past it; the oldest goes before that sentence's end, after the first. */
  const said = theQueueSaid(counts);
  const [first, ...rest] = said.split(/(?<=\.)\s+/);
  return [first + oldest, ...rest].join(' ').replace(/\s+/g, ' ').trim();
}

/** The WhatsApp message: the template's body with its three blanks filled, so it reads the same inside and outside the 24 hours. */
export function theSummaryOnWhatsApp(firstName: string | null | undefined, paragraph: string, link: string) {
  const params = [firstName?.trim() || 'there', oneLine(paragraph), link];
  return { kind: 'requests-waiting', text: fill(TEMPLATES['requests-waiting'].body, params), params };
}

/** The email: the same paragraph, in the same words. */
export function theSummaryByEmail(firstName: string | null | undefined, paragraph: string) {
  return { subject: paragraph.split(/(?<=\.)\s/)[0].replace(/\.$/, ''), greeting: `Hi ${firstName?.trim() || 'there'},`, paragraph };
}
