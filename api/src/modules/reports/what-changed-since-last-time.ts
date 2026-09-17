/**
 * FROM SESSION 2, THE PICTURE SHOULD OPEN ON WHAT MOVED. 4.3.
 *
 * Every round's shared picture was written as though it were the first one, so a reader on session
 * four got a fresh description of a situation they already knew, and had to work out for themselves
 * what was different from last time. The one thing only this product can tell them - what changed
 * across everybody's accounts at once - was the thing it never said.
 *
 * COMPUTED, NOT ASKED FOR, like the arithmetic beside it. Two facts, both countable:
 *
 *   how many people answered this round against last round
 *   which differences are new, which are settled, and which are still open
 *
 * NO VERDICT ON THE DIRECTION. "Two of last round's three differences are still open" is a fact.
 * "Progress is slow" is a read on people, and the moment this sentence carries one it has become a
 * score. Same rule as how-this-has-moved, for the same reason.
 *
 * NOTHING ON THE FIRST ROUND, and nothing where the rounds are identical: a sentence saying nothing
 * changed, printed every session, teaches people to skip the top of the report.
 */

export interface ARound {
  /** Topics of the differences that round, as the report named them. */
  topics: string[];
  /** How many people had answered when it was taken. */
  answered: number;
}

const andList = (xs: string[]) =>
  xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export function whatChangedSinceLastTime(now: ARound, before: ARound | null): string | null {
  if (!before) return null;

  const carried = now.topics.filter((t) => before.topics.some((b) => same(t, b)));
  const fresh = now.topics.filter((t) => !before.topics.some((b) => same(t, b)));
  const gone = before.topics.filter((t) => !now.topics.some((n) => same(t, n)));

  /*
   * NOTHING CHANGED IS NOT A MOVEMENT. Carried differences alone, with nobody new answering, is
   * last round's report again - and a line saying so at the top of every session teaches people to
   * skip the top of the report. It is said only alongside something that actually moved.
   */
  const somethingMoved = fresh.length > 0 || gone.length > 0 || now.answered !== before.answered;
  if (!somethingMoved) return null;

  const parts: string[] = [];
  if (carried.length) {
    parts.push(`${carried.length === 1 ? 'One difference is' : `${carried.length} differences are`} still open from last time: ${andList(carried)}`);
  }
  if (gone.length) {
    parts.push(`${andList(gone)} ${gone.length === 1 ? 'is' : 'are'} no longer showing as a difference`);
  }
  if (fresh.length) {
    parts.push(`${andList(fresh)} ${fresh.length === 1 ? 'is' : 'are'} new this round`);
  }
  if (now.answered !== before.answered) {
    parts.push(`${now.answered} of the check-in answered this round, against ${before.answered} last time`);
  }

  if (!parts.length) return null;
  return `Since the last round: ${parts.join('. ')}.`;
}
