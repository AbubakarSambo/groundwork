import { A_CHECK_IN_TAKES_MINUTES, ABOUT_HOW_LONG } from '../../common/how-long-a-check-in-takes';

/**
 * A CHECK-IN TAKES ABOUT AS LONG AS WE SAY.
 *
 * The product says how long a check-in takes from one owner (common/how-long-a-check-in-takes.ts), and the site's frozen copy
 * says "about ten minutes". Neither was measured on real people. A session has a started and a completed
 * timestamp, so the median is one query away, and it goes where the ops board already shows product
 * numbers - never on the marketing page as a live figure, which is built at build time. If the
 * median comes back materially off ten, the copy is wrong and the owner is told; the site's copy is
 * frozen, so only the in-product sentence can move, and the site would then disagree with the
 * product. That is a decision to surface, not a defect to fix here.
 */

/** The number the product says, in minutes, from its one owner. Asserted against the range below, never against the median directly. */
export const WHAT_WE_SAY_MINUTES = A_CHECK_IN_TAKES_MINUTES;

/** "About" is honest from half of it to twice it. Outside that, the sentence is a claim the product does not keep. */
export const A_FAIR_RANGE: readonly [number, number] = [WHAT_WE_SAY_MINUTES / 2, WHAT_WE_SAY_MINUTES * 2];

export function medianOf(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function saysTheTruth(medianMinutes: number | null): boolean | null {
  if (medianMinutes == null) return null;
  return medianMinutes >= A_FAIR_RANGE[0] && medianMinutes <= A_FAIR_RANGE[1];
}

export function whatTheMedianSays(medianMinutes: number | null, over: number): string {
  if (medianMinutes == null) return 'No completed sessions in this window, so there is no duration to give';
  const verdict = saysTheTruth(medianMinutes) ? `"${ABOUT_HOW_LONG}" holds` : `"${ABOUT_HOW_LONG}" does not hold, so the length the product says is wrong`;
  return `Median ${medianMinutes} minutes over ${over} sessions; ${verdict}`;
}
