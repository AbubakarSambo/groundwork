import { TEMPLATES, fill, oneLine } from '../whatsapp/a-message-outside-the-window';
import { theQueueSaid, type TheQueue } from './the-approvals-queue.service';

/**
 * SEVERAL THAT ARRIVE TOGETHER ARE SAID ONCE (suites at scale; decision 92).
 *
 * Every request is told to its approver straight away, as it always was, and never held for a summary, and it is not the person's one
 * message of the day. Only requests that arrive together are gathered into one message: the ones the clock passes on to the same
 * person in one run, or a backlog found in one sweep. The summary says how many, how many of each kind, how long the oldest has
 * waited and how many have waited too long, and nothing anybody wrote. The half past seven morning sweep is only the catch-up for
 * what was not told: it never repeats a request already told. It goes on WhatsApp when it can and by email when it cannot, never both.
 * Hours requests are never held, gathered or counted here: they are told straight away.
 *
 * QUIET HOURS. A summary does not go between eight in the evening and seven in the morning where the person is: in their own time
 * zone when the staff directory has one (decision 83), and in Lagos, where the boards are dated, otherwise.
 */

export const QUIET_FROM_HOUR = 20;
export const QUIET_UNTIL_HOUR = 7;

/** The hour it is where the person is. A zone that is not known, or is not a zone, is Lagos, which has no daylight saving. */
export function theHourThere(now: Date, timeZone?: string | null): number {
  const at = (zone: string) => Number(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hourCycle: 'h23', timeZone: zone }).format(now));
  try { return at(timeZone?.trim() || 'Africa/Lagos'); } catch { return at('Africa/Lagos'); }
}
export const lagosHour = (now: Date) => theHourThere(now);

export function itIsQuietNow(now: Date = new Date(), timeZone?: string | null): boolean {
  const h = theHourThere(now, timeZone);
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
