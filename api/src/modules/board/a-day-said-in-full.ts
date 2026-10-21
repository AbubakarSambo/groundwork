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
  return `${WEEKDAYS[new Date(Date.UTC(y, m - 1, day, 12)).getUTCDay()]} ${day} ${MONTHS[m - 1]}`;
}
