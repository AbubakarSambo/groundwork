import { Cadence } from '@prisma/client';

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
