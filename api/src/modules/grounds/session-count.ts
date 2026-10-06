import { Cadence } from '@prisma/client';
import { theNextDayTheyWork } from './which-days-this-team-works';

/**
 * How many check-ins a ground actually holds.
 *
 * The engine tells people this in their very first message - "this is the first
 * of N check-ins". It was never given the number, and the fallback was a
 * hardcoded 4, so every ground on the platform said four regardless of how long
 * it ran. A twelve-session onboarding that doubles as a probation told four
 * people their assessment period was a third of its real length.
 *
 * Days between check-ins, by cadence. ONE_TIME and SEQUENTIAL have no interval:
 * one is a single session by definition, the other fires when the lead checks in,
 * so neither is a function of elapsed time.
 */
const DAYS_BETWEEN: Partial<Record<Cadence, number>> = {
  [Cadence.DAILY]: 1,
  [Cadence.WEEKLY]: 7,
  [Cadence.FORTNIGHTLY]: 14,
  [Cadence.MONTHLY]: 30,
};

export function totalSessionsFor(timelineDays: number | null | undefined, cadence: Cadence | null | undefined): number | null {
  if (cadence === Cadence.ONE_TIME) return 1;
  const gap = cadence ? DAYS_BETWEEN[cadence] : undefined;
  if (!gap || !timelineDays || timelineDays <= 0) return null;
  // At least one: a two-week ground on a monthly cadence still holds a check-in,
  // and telling someone they have zero would read as broken.
  return Math.max(1, Math.floor(timelineDays / gap));
}

/**
 * HOW LONG IT RUNS WHEN THE LEAD CHOSE AN END (U.6 review).
 *
 * Read live: "until 6 November", weekly, was saved as the scenario's default 90 days, so the check-in
 * said "Session 1 of 12" and "90 days, 12 sessions" while its invitation said "until 6 November". The
 * chosen end has to set the length. The dates are walked the way the setup screen lists them (the
 * first day they work from the start, then one step of the rhythm at a time, each moved to a day they
 * work, up to and including the end), and the length is that many steps, so `totalSessionsFor` gives
 * back exactly the check-ins the lead was shown. Days are compared as days, never as times.
 */
export function timelineDaysForAChosenEnd(a: {
  startsAt: Date | null;
  endsAt: Date;
  cadence: Cadence;
  workingDays?: number[] | null;
  now?: Date;
}): number {
  const dayOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const from = dayOf(a.startsAt ?? a.now ?? new Date());
  const end = dayOf(a.endsAt);
  const inclusiveDays = Math.max(1, Math.round((end.getTime() - from.getTime()) / 86_400_000) + 1);
  const gap = DAYS_BETWEEN[a.cadence];
  if (!gap) return inclusiveDays;
  let d = theNextDayTheyWork(from, a.workingDays);
  let count = 0;
  while (d <= end && count < 2000) {
    count += 1;
    const next = new Date(d);
    if (a.cadence === Cadence.MONTHLY) next.setMonth(next.getMonth() + 1);
    else next.setDate(next.getDate() + gap);
    d = theNextDayTheyWork(next, a.workingDays);
  }
  return Math.max(1, count) * gap;
}
