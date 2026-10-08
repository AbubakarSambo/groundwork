import { aPromiseInsideASentence } from '../conversation/a-promise-inside-a-sentence';
/**
 * WHEN A COMMITMENT HAS SLIPPED, AND WHEN IT IS ANYBODY'S BUSINESS TO SAY SO.
 *
 * Two rules, kept apart because they answer different questions. Whether something is late is about
 * the record. Whether to mention it is about the person, and mentioning everything the moment it is
 * true is how a tool becomes something people close.
 */

export interface CommitmentLike {
  id: string;
  text: string;
  dueSaid: string | null;
  /** Null is the normal case: they said "end of the quarter" and nobody turned that into a date. */
  dueAt: Date | null;
  state: 'OPEN' | 'KEPT' | 'SLIPPED' | 'DROPPED';
  lastFollowedUpAt: Date | null;
}

/**
 * A COMMITMENT WITH NO DATE IS NEVER LATE.
 *
 * Not "probably fine", not "assume the end of the month" - never late, because we genuinely do not
 * know. `dueSaid` holds what they actually said and is deliberately never parsed; inventing a date
 * from "soon" and then telling somebody they missed it is the product being wrong about them in
 * writing, which is the one thing it must not do.
 */
export function hasSlipped(c: CommitmentLike, now: Date): boolean {
  if (c.state !== 'OPEN') return false;
  if (!c.dueAt) return false;
  return c.dueAt.getTime() < now.getTime();
}

/**
 * THE ONE THING WORTH RAISING, OR NOTHING.
 *
 * At most one slipped commitment, and the oldest rather than the newest: the thing somebody has
 * been carrying longest is the one that has gone quiet, and the one they are least likely to raise
 * themselves. A list of five is a list nobody reads.
 */
export function theOneToRaise(commitments: CommitmentLike[], now: Date): CommitmentLike | null {
  const slipped = commitments.filter((c) => hasSlipped(c, now));
  if (!slipped.length) return null;
  return slipped.reduce((a, b) => (a.dueAt!.getTime() <= b.dueAt!.getTime() ? a : b));
}

/**
 * NOT TWICE IN A DAY, AND THE DAY IS A CALENDAR DAY.
 *
 * Elapsed hours would make somebody nudged at 23:50 fair game at 00:05, which is the letter of the
 * rule and not the point of it. The point is that opening this thing should not feel like being
 * chased.
 */
export function alreadyNudgedToday(lastNudgedOn: Date | null | undefined, now: Date): boolean {
  if (!lastNudgedOn) return false;
  return sameDay(lastNudgedOn, now);
}

function sameDay(a: Date, b: Date): boolean {
  return a.getUTCFullYear() === b.getUTCFullYear()
    && a.getUTCMonth() === b.getUTCMonth()
    && a.getUTCDate() === b.getUTCDate();
}

/**
 * What the panel opens with when something has slipped, in the person's own words back at them.
 *
 * Quoting what they said rather than describing it - "you said Wednesday" rather than "you have an
 * overdue commitment" - because the first is a colleague remembering and the second is a system
 * keeping score. The product exists to be the first one.
 */
export function slippedOpening(c: CommitmentLike): { line: string; source: string; suggestions: string[] } {
  /*
   * Their words for the deadline go INSIDE the sentence rather than after it. The first version
   * read "you said you would send the comparison. You said Wednesday." - two "you said"s in a row,
   * which is the sound of a system reciting a record rather than somebody remembering.
   */
  const when = c.dueSaid ? ` by ${c.dueSaid}` : '';
  return {
    line: `Last time you said you would ${lowerFirst(c.text)}${when}. How did that go?`,
    source: 'commitment_slipped',
    suggestions: ['Done', 'Not yet', 'Something changed'],
  };
}

function lowerFirst(s: string): string {
  return aPromiseInsideASentence(s);
}
