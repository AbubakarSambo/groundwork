import { timesAWeekInWords, theHourACheckInOpens } from '../grounds/the-check-ins-own-schedule';
/**
 * HOW OFTEN A CHECK-IN ASKS, IN ONE PLAIN SENTENCE, for the invitation (A3, #/join/invite).
 *
 * The prototype says "About two minutes each weekday, from 4pm, on what moved with your deals." This says the rhythm, the hour it
 * opens where it opens at a set hour, and the check-in's name, all from what setup holds, and nothing it would have to guess (see
 * whenItAsks). It mirrors the scheduler's fields and is never a promise of a date.
 */
export type ACadence = 'DAILY' | 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'SEQUENTIAL' | 'ONE_TIME';

/**
 * HOW LONG A TEAM MEMBER'S CHECK-IN TAKES, MEASURED (F5, the approved journey, stage 6: "about two minutes"). The one owner: the
 * invitation's "What it asks" and the line under its button both read it (served as `takes`). Measured on 3 November 2026 from the
 * local test database gw_loop_round16, read only: 448 answered check-ins of people who are not the lead, first message to last,
 * median 1.9 minutes, middle half 0.6 to 2.8 minutes. Re-measure after each run and change it here.
 */
export const A_CHECK_IN_TAKES = 'About two minutes';
const ABOUT = A_CHECK_IN_TAKES;

const DAY_NAMES = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];

function listed(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/** The days they work, in words, or null when nobody restricted them. */
function theDays(workingDays: number[] | null | undefined): string | null {
  const days = [...new Set((workingDays ?? []).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort((a, b) => a - b);
  if (days.length === 0 || days.length === 7) return null;
  if (days.join(',') === '1,2,3,4,5') return 'weekday';
  return listed(days.map((d) => DAY_NAMES[d]));
}

/** "8am", "12pm", "4pm". */
const anHour = (h: number) => `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? 'am' : 'pm'}`;

/**
 * THE INVITATION'S "FROM 4PM" AND TOPIC (Hafsah, 3 November 2026, word for word: "'From 4pm' and the topic in the invitation come from
 * what setup already holds: the check-in's opening time and its name or purpose. If either isn't set, leave it out; don't guess.") The
 * opening time is the schedule's own (theHourACheckInOpens), said only where a check-in opens at a set hour; the topic is the check-in's
 * name. "About two minutes each weekday, from 8am, for Deal progress."
 */
export function whenItAsks(g: {
  cadence: ACadence | string;
  cadenceAnchorDay?: number | null;
  cadenceDays?: number[] | null;
  workingDays?: number[] | null;
  leadFirstName?: string | null;
  /** The check-in's name, as the topic. Left out where there is none. */
  label?: string | null;
}): string {
  const lead = (g.leadFirstName ?? '').trim();
  const hour = theHourACheckInOpens(String(g.cadence));
  const from = hour == null ? '' : `, from ${anHour(hour)}`;
  const topic = g.label?.trim() ? `, for ${g.label.trim().replace(/[.\s]+$/, '')}` : '';
  const said = (rhythm: string) => `${ABOUT}${rhythm ? ` ${rhythm}` : ''}${from}${topic}.`;
  switch (g.cadence) {
    case 'DAILY': {
      const days = theDays(g.workingDays);
      if (!days) return said('each day');
      if (days === 'weekday') return said('each weekday');
      return said(`on ${days}`);
    }
    case 'WEEKLY': {
      const often = timesAWeekInWords({ cadence: g.cadence, days: g.cadenceDays });
      if (often) return said(often);
      const d = g.cadenceAnchorDay;
      return Number.isInteger(d) && d! >= 0 && d! <= 6 ? said(`every week, on ${DAY_NAMES[d!]}`) : said('every week');
    }
    case 'FORTNIGHTLY':
      return said('every two weeks');
    case 'MONTHLY':
      return said('once a month');
    case 'SEQUENTIAL':
      return said(lead ? `each time ${lead} checks in` : 'each time the person who runs it checks in');
    case 'ONE_TIME':
      return `One check-in, of ${ABOUT.toLowerCase()}${topic}.`;
    default:
      return said('');
  }
}
