import { howOftenItRuns, theHourACheckInOpens } from '../grounds/the-check-ins-own-schedule';
import { A_CHECK_IN_TAKES } from '../../common/how-long-a-check-in-takes';
/**
 * HOW OFTEN A CHECK-IN ASKS, IN ONE PLAIN SENTENCE, for the invitation (A3, #/join/invite).
 *
 * The prototype says "About two minutes each weekday, from 4pm, on what moved with your deals." This says the rhythm, the hour it
 * opens where it opens at a set hour, and the check-in's name, all from what setup holds, and nothing it would have to guess (see
 * whenItAsks). It mirrors the scheduler's fields and is never a promise of a date.
 */
export type ACadence = 'DAILY' | 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'SEQUENTIAL' | 'ONE_TIME';

/* How long a check-in takes, from its one owner (common/how-long-a-check-in-takes.ts). */
const ABOUT = A_CHECK_IN_TAKES;

/** "8am", "12pm", "4pm". */
const anHour = (h: number) => `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? 'am' : 'pm'}`;

/**
 * THE INVITATION'S "FROM 4PM" AND TOPIC (Hafsah, 3 November 2026, word for word: "'From 4pm' and the topic in the invitation come from
 * what setup already holds: the check-in's opening time and its name or purpose. If either isn't set, leave it out; don't guess.") The
 * opening time is the schedule's own (theHourACheckInOpens), said only where a check-in opens at a set hour; the topic is the check-in's
 * name. "About ten minutes every weekday, Monday to Friday, from 8am, for Deal progress."
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
  /* How often, in the one wording every page reads (howOftenItRuns, staging check S18). */
  if (g.cadence === 'SEQUENTIAL') return said(lead ? `each time ${lead} checks in` : 'each time the person who runs it checks in');
  if (g.cadence === 'ONE_TIME') return `One check-in, of ${ABOUT.toLowerCase()}${topic}.`;
  return said(howOftenItRuns(g));
}
