/**
 * A CHECK-IN TAKES ABOUT AS LONG AS WE SAY.
 *
 * The site says "A check-in takes about ten minutes" and the product repeats it to the person
 * mid-session (GroundChat.tsx). Nothing measured it. A session has a started and a completed
 * timestamp, so the median is one query away, and it goes where the ops board already shows product
 * numbers - never on the marketing page as a live figure, which is built at build time. If the
 * median comes back materially off ten, the copy is wrong and the owner is told; the site's copy is
 * frozen, so only the in-product sentence can move, and the site would then disagree with the
 * product. That is a decision to surface, not a defect to fix here.
 */

/** The number the copy says, in minutes. Asserted against the range below, never against the median directly. */
export const WHAT_WE_SAY_MINUTES = 10;

/** "About ten" is honest inside this. Outside it, the sentence is a claim the product does not keep. */
export const A_FAIR_RANGE: readonly [number, number] = [5, 20];

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
  const verdict = saysTheTruth(medianMinutes) ? `"about ${WHAT_WE_SAY_MINUTES} minutes" holds` : `"about ${WHAT_WE_SAY_MINUTES} minutes" does not hold - the copy is wrong`;
  return `Median ${medianMinutes} minutes over ${over} sessions; ${verdict}`;
}
