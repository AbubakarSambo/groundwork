/**
 * HOW THINGS HAVE MOVED, ROUND BY ROUND.
 *
 * The last thing the audit asked for: not a score, and not a fresh judgement at the end, but the
 * account as it stood at each round put next to the ones before it - so somebody can see that role
 * clarity settled by day 30 and that commercial execution did not.
 *
 * IT IS NOT A NEW READING OF ANYTHING. Every line here was written when that round closed and
 * nothing re-decides it now. That is the whole point: a trajectory assembled at day 90 from a pile
 * of transcripts is a story told once at the end, and one read back from what was recorded at the
 * time is a record.
 *
 * NO SCORE, NO TIER, NO DIRECTION OF TRAVEL. It shows what was said and when. Whether that is
 * improvement is the reader's judgement, and the moment this product renders an arrow it has
 * started rating people.
 */

import { withoutAStoredCount } from './the-picture-in-plain-sentences';

export interface KeptRound {
  round: number;
  sharedPicture: string;
  divergences: unknown;
  takenAt: Date | string;
  amendedAt?: Date | string | null;
  amendedNote?: string | null;
}

export interface Movement {
  round: number;
  /** The same number, under the name every page reads: a row served without it was said as "On 4 December", a day that is no round's, instead of "At the end of check-in 3, on 4 December" (run 10). */
  sessionNumber: number;
  takenAt: string;
  /** The one line that round's picture opened with. */
  says: string;
  /** How many accounts differed that round. A count, never a characterisation. */
  differences: number;
  /** Set only where the round was changed after it was first taken. */
  amended: string | null;
}

/**
 * The first sentence of a picture, which is what that round led with. A count of who had answered is not what a round led with: it was
 * true on the day it was written ("One of the five people has answered so far" stayed under 23 December after all five had), so, as
 * on the board and the lists, it is left out and what follows it is read first (withoutAStoredCount, the one owner of that rule).
 */
function opening(picture: string): string {
  const t = withoutAStoredCount((picture ?? '').trim());
  if (!t) return '';
  const end = t.search(/[.!?](\s|$)/);
  const first = end === -1 ? t : t.slice(0, end + 1);
  /*
   * The whole sentence, not 217 characters of it. A line cut mid-word is the report deciding the
   * reader cannot have the end of somebody's thought; length is a layout problem and belongs in CSS.
   */
  return first;
}

function count(divergences: unknown): number {
  return Array.isArray(divergences) ? divergences.length : 0;
}

/**
 * Rounds in order, oldest first, so it reads as a sequence.
 *
 * A single round returns a single row rather than nothing: "this is where it started" is worth
 * seeing on day 14, and a section that appears only once there are three of them is a section
 * nobody discovers.
 */
export function howThisHasMoved(rounds: KeptRound[]): Movement[] {
  return [...rounds]
    .sort((a, b) => a.round - b.round)
    .map((r) => ({
      round: r.round,
      sessionNumber: r.round,
      takenAt: new Date(r.takenAt).toISOString().slice(0, 10),
      says: opening(r.sharedPicture),
      differences: count(r.divergences),
      amended: r.amendedAt ? (r.amendedNote?.trim() || 'Updated after this round closed.') : null,
    }))
    .filter((m) => !!m.says);
}
