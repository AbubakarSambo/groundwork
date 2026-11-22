import { Cadence } from '@prisma/client';
import { theRoundDaysUpTo } from '../grounds/the-check-ins-own-schedule';
import { theDayIn } from '../grounds/when-a-handoff-is-due';
import { THE_PRODUCTS_OWN_ZONE } from '../../common/the-organisations-own-day';

/**
 * THE DATES A SETUP WILL OPEN ON, FROM THE CHECK-IN'S OWN SCHEDULE, BEFORE IT IS SAVED (setup, 23 November 2026).
 *
 * The setup screen counted its own dates and said "29 in all" where the saved check-in held 25, and opened on a Sunday the saved one
 * moves to Monday. Now the screen asks here, and here reads the one schedule (the-check-ins-own-schedule.ts) with the defaults the save
 * uses: no start date is "now", today in the organisation's day; no days given is Monday to Friday, the check-in's own default.
 */
export type TheSetupsSchedule = {
  cadence?: string;
  cadenceAnchorDay?: number | null;
  cadenceDays?: number[] | null;
  workingDays?: number[] | null;
  /** YYYY-MM-DD, or empty for now. */
  startsOn?: string | null;
  /** YYYY-MM-DD, or empty when it runs until the lead ends it. */
  endsOn?: string | null;
  zone?: string | null;
};

const DAY = 86_400_000;
const asDay = (s: string) => Date.UTC(Number(s.slice(0, 4)), Number(s.slice(5, 7)) - 1, Number(s.slice(8, 10)));
const isADate = (s?: string | null) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(asDay(s));
const asIso = (d: number) => new Date(d).toISOString().slice(0, 10);

/** The first few days it opens on, and how many in all when it has an end (null when it has none). */
export function theDatesBeforeItIsSaved(s: TheSetupsSchedule, now: Date = new Date(), shown = 5): { days: string[]; count: number | null } {
  const cadence = (Object.values(Cadence) as string[]).includes(s.cadence ?? '') ? (s.cadence as Cadence) : Cadence.WEEKLY;
  if (cadence === Cadence.SEQUENTIAL) return { days: [], count: null };
  const zone = s.zone || THE_PRODUCTS_OWN_ZONE;
  const today = theDayIn(zone, now).getTime();
  const startsNow = !isADate(s.startsOn);
  const start = startsNow ? today : asDay(s.startsOn!);
  const workingDays = s.workingDays && s.workingDays.length ? s.workingDays : [1, 2, 3, 4, 5];
  const schedule = { cadence, anchorDay: s.cadenceAnchorDay ?? null, days: s.cadenceDays ?? null, workingDays, startsNow };
  if (cadence === Cadence.ONE_TIME) {
    const [only] = theRoundDaysUpTo(schedule, start, start + 14 * DAY, 1);
    return { days: only != null ? [asIso(only)] : [], count: 1 };
  }
  if (!isADate(s.endsOn)) return { days: theRoundDaysUpTo(schedule, start, start + 400 * DAY, shown).map(asIso), count: null };
  const all = theRoundDaysUpTo(schedule, start, asDay(s.endsOn!));
  return { days: all.slice(0, shown).map(asIso), count: all.length };
}
