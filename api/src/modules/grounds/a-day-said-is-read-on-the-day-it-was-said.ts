import { theDayTheyMeant } from './when-a-handoff-is-due';
import { aDayPeopleRead } from '../board/one-count-for-the-sessions';

/**
 * "TOMORROW" IS READ ON THE DAY IT WAS SAID (reviewer, 14 October).
 *
 * Kevin said on 14 October "I will visit two shops in Westlands tomorrow." Three days later his board still read the
 * promise with "tomorrow" under it, as if it were still to come. A day said in relative words ("today", "tomorrow",
 * "on Friday") means the day it meant when it was said. Still open after that day, it says so: "It was due on
 * 15 October." Before it, the day itself is said. Words that name no day ("soon", "after the audit") stay as they were.
 */
export function whenItWasFor(whenSaid: string | null | undefined, saidAt: Date | string | null | undefined, now: Date): string | null {
  const words = String(whenSaid ?? '').trim().replace(/^on\s+/i, '').trim() || null;
  if (!words || !saidAt) return words;
  const said = new Date(saidAt);
  if (Number.isNaN(said.getTime())) return words;
  /* Only a day said relative to when it was said is re-read; a date said in full is already a day. */
  if (!/\b(?:today|tonight|tomorrow|end of (?:the )?day|eod|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(words)) return words;
  const day = theDayTheyMeant(words, said);
  if (!day) return words;
  const dayStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  if (day.getTime() < dayStart) return `It was due on ${aDayPeopleRead(day, now)}.`;
  if (day.getTime() === dayStart) return 'today';
  /* Still ahead: a weekday reads as they said it ("Friday"); "tomorrow" said yesterday is no longer tomorrow, so it is the day. */
  return /\b(?:today|tonight|tomorrow|end of (?:the )?day|eod)\b/i.test(words) ? aDayPeopleRead(day, now) : words;
}
