/**
 * A DAY IS NAMED RIGHT (polish round 1, 26 October 2026).
 *
 * Aisha read, on Tuesday 13 October, "What did you do about those witness statements for Jamii Clinics by the end of yesterday,
 * Tuesday?" Yesterday was Monday. The calendar is not the model's to guess: the product knows what day it is. A weekday said with
 * "yesterday", "today" or "tomorrow", or with a date, is put right from the calendar. Nothing else in the sentence changes.
 */
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const A_DAY = `(${DAYS.join('|')})`;

/** The weekday of a calendar day, counted in the given time zone. */
function weekdayOf(d: Date, timeZone: string): string {
  return d.toLocaleDateString('en-GB', { weekday: 'long', timeZone });
}

export function aDayIsNamedRight(text: string, now: Date, timeZone = 'Africa/Nairobi'): { text: string; changed: boolean } {
  if (!text || !new RegExp(A_DAY).test(text)) return { text, changed: false };
  const DAY = 86_400_000;
  const near: Record<string, string> = {
    yesterday: weekdayOf(new Date(now.getTime() - DAY), timeZone),
    today: weekdayOf(now, timeZone),
    tomorrow: weekdayOf(new Date(now.getTime() + DAY), timeZone),
  };
  let out = text.replace(new RegExp(`\\b(yesterday|today|tomorrow)(,?\\s+\\(?)${A_DAY}\\b`, 'gi'), (m, word: string, between: string) => `${word}${between}${near[word.toLowerCase()]}`);
  out = out.replace(new RegExp(`\\b${A_DAY}(,?\\s+)(yesterday|today|tomorrow)\\b`, 'gi'), (m, _d: string, between: string, word: string) => `${near[word.toLowerCase()]}${between}${word}`);
  /* "Wednesday 13 October": the date is what was meant, so the weekday follows it. The year is this one. */
  const year = Number(now.toLocaleDateString('en-GB', { year: 'numeric', timeZone }));
  out = out.replace(new RegExp(`\\b${A_DAY}(,?\\s+)(\\d{1,2})(?:st|nd|rd|th)?(\\s+)(${MONTHS.join('|')})\\b`, 'g'), (m, _d: string, a: string, day: string, b: string, month: string) => {
    const at = new Date(Date.UTC(year, MONTHS.indexOf(month), Number(day), 12));
    return `${weekdayOf(at, 'UTC')}${a}${day}${b}${month}`;
  });
  return { text: out, changed: out !== text };
}
