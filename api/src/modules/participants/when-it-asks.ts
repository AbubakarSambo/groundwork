import { timesAWeekInWords } from '../grounds/the-check-ins-own-schedule';
/**
 * HOW OFTEN A CHECK-IN ASKS, IN ONE PLAIN SENTENCE, for the invitation (A3, #/join/invite).
 *
 * The prototype says "About two minutes each weekday, from 4pm, on what moved with your deals." Only
 * the rhythm is something the record holds for every check-in: there is no reminder time, and what it
 * asks about is the conversation's, not the schedule's. So this says the rhythm and nothing it would
 * have to guess. It mirrors the scheduler's fields and is never a promise of a date.
 */
export type ACadence = 'DAILY' | 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'SEQUENTIAL' | 'ONE_TIME';

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

export function whenItAsks(g: {
  cadence: ACadence | string;
  cadenceAnchorDay?: number | null;
  cadenceDays?: number[] | null;
  workingDays?: number[] | null;
  leadFirstName?: string | null;
}): string {
  const lead = (g.leadFirstName ?? '').trim();
  switch (g.cadence) {
    case 'DAILY': {
      const days = theDays(g.workingDays);
      if (!days) return 'A short check-in each day.';
      if (days === 'weekday') return 'A short check-in each weekday.';
      return `A short check-in on ${days}.`;
    }
    case 'WEEKLY': {
      const often = timesAWeekInWords({ cadence: g.cadence, days: g.cadenceDays });
      if (often) return `A short check-in ${often}.`;
      const d = g.cadenceAnchorDay;
      return Number.isInteger(d) && d! >= 0 && d! <= 6 ? `A short check-in every week, on ${DAY_NAMES[d!]}.` : 'A short check-in every week.';
    }
    case 'FORTNIGHTLY':
      return 'A short check-in every two weeks.';
    case 'MONTHLY':
      return 'A short check-in once a month.';
    case 'SEQUENTIAL':
      return lead ? `A short check-in each time ${lead} checks in.` : 'A short check-in each time the person who runs it checks in.';
    case 'ONE_TIME':
      return 'One short check-in.';
    default:
      return 'A short check-in.';
  }
}
