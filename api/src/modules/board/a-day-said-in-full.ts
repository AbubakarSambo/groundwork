import { theDayZone } from '../../common/the-organisations-own-day';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/**
 * "Friday 16 October": a day with its weekday, as the kit writes a day a person has to act on ("Delivery Friday 16 October;
 * Greenfield pays on delivery"). A date-only value (midnight UTC, from theDayTheyMeant) is read as that calendar day; any other
 * moment is read in the organisation's own day.
 */
export function aDaySaidInFull(d: Date): string {
  const midnight = d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0;
  const key = midnight
    ? d.toISOString().slice(0, 10)
    : new Intl.DateTimeFormat('en-CA', { timeZone: theDayZone(), year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  const [y, m, day] = key.split('-').map(Number);
  return `${WEEKDAYS[new Date(Date.UTC(y, m - 1, day, 12)).getUTCDay()]} ${day} ${MONTHS[m - 1]}${theYearIfNotThisOne(y)}`;
}

/*
 * AND THE YEAR, WHEN IT IS NOT THIS ONE (fix plan, pattern 4; quarter test). People and setup said "until 12 October" for a check-in that
 * runs to 12 October 2027, read in November 2026, so it read as a date long past. A day in another year says its year.
 */
export function theYearIfNotThisOne(year: number, now: Date = new Date()): string {
  const thisYear = Number(new Intl.DateTimeFormat('en-CA', { timeZone: theDayZone(), year: 'numeric' }).format(now));
  return year && year !== thisYear ? ` ${year}` : '';
}

/** A day as "12 October", or "12 October 2027" in another year, in a zone; with its weekday when asked. The one way a day is written. */
export function aDayInItsZone(d: Date, zone: string, weekday = false, now: Date = new Date()): string {
  const said = new Intl.DateTimeFormat('en-GB', { ...(weekday ? { weekday: 'long' } : {}), day: 'numeric', month: 'long', timeZone: zone }).format(d).replace(',', '');
  const year = Number(new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric' }).format(d));
  return `${said}${theYearIfNotThisOne(year, now)}`;
}
