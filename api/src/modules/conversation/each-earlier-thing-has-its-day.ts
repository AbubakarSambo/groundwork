import { whenItWas } from '../../common/a-date-reads-the-same-everywhere';
import { theDayTheyMeant } from '../grounds/when-a-handoff-is-due';

/**
 * EACH EARLIER THING HAS ITS DAY, AND THE MODEL KNOWS WHAT DAY IT IS TODAY (messages test, third run, items 7, 10, 12 and 13).
 *
 * The check-in gave the model a person's earlier words and promises with no day on them, and never said what day it was. So it
 * counted their "yesterday", "tomorrow" and "on Friday" from today:
 *  - Brian said on Monday 12 October "I will send the draft reply to Wanjiru for her review tomorrow." On Tuesday he was asked "Did
 *    you send it to her yesterday?" and then "What made it miss the internal deadline for Wanjiru's review?". Nothing was due yet.
 *  - Aisha said on Tuesday 13 October "I chased the client's HR manager yesterday, on Monday." On Wednesday she was asked why calling
 *    again would work "when chasing them yesterday didn't".
 *  - David said on Monday 12 October he would finish the review "by Friday, October 16th". On Wednesday he was asked "What happened
 *    with that review by Friday, October 16th?". Amos was asked on Wednesday what happened at Westlands Pharmacy on Friday.
 *
 * THE FIX IS FACTS, NOT A SCRIPT. The model is told today's day, the day each earlier line was said, and, for each thing they said
 * they would do, the day it was for, counted from the day it was said, and whether that day has come. It still writes every word.
 */

export const DAY = 86_400_000;
const dayIn = (d: Date, zone?: string) => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: zone || 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  const [y, m, dd] = parts.split('-').map(Number);
  return Date.UTC(y, m - 1, dd);
};
const NUMBERS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const days = (n: number) => `${n < NUMBERS.length ? NUMBERS[n] : n} ${n === 1 ? 'day' : 'days'}`;

/** "Wednesday 14 October", in the organisation's own zone. */
export function theDay(d: Date | string, zone?: string): string {
  return whenItWas(new Date(d), 'weekdayAndDay', zone);
}

/** The line that tells the model what day it is, and how to count a day somebody named. */
export function todayForTheModel(now: Date, zone?: string): string {
  return [
    `TODAY IS ${theDay(now, zone)}.`,
    'Each earlier thing below says the day it was said. A day somebody named, such as "yesterday", "tomorrow" or "on Friday", is counted from the day they said it, never from today.',
    'Never ask what happened on a day that has not come yet, and never say something was missed or late before its day has passed.',
  ].join(' ');
}

/**
 * The day a promise was for, from the day it was said: "said on Monday 12 October; "tomorrow" was Tuesday 13 October, which is
 * today". Empty where nothing on record says when it was said.
 */
export function theDayAPromiseWasFor(whenSaid: string | null | undefined, saidOn: Date | string | null | undefined, now: Date, zone?: string): string {
  if (!saidOn) return '';
  const on = new Date(saidOn);
  if (Number.isNaN(on.getTime())) return '';
  const said = ` (said on ${theDay(on, zone)}`;
  const when = String(whenSaid ?? '').trim();
  if (!when) return `${said})`;
  /* Counted from the day it was said, in their zone. */
  const localSaidOn = new Date(dayIn(on, zone));
  const due = theDayTheyMeant(when, localSaidOn);
  if (!due) return `${said}, "${when}")`;
  const gap = Math.round((due.getTime() - dayIn(now, zone)) / DAY);
  const dueDay = whenItWas(due, 'weekdayAndDay', 'UTC');
  const where = gap === 0 ? 'today' : gap < 0 ? `${days(-gap)} ago` : `${days(gap)} from now, so it has not come yet`;
  return `${said}, "${when}", which is ${dueDay}, ${where})`;
}

/** An earlier line, with the day it was said. */
export function aLineWithItsDay(text: string, saidOn: Date | string | null | undefined, zone?: string): string {
  return saidOn ? `- On ${theDay(saidOn, zone)} they said "${text}"` : `- "${text}"`;
}
