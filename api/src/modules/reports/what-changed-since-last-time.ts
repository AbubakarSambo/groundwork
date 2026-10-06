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

  /*
   * EACH TOPIC IS A SENTENCE ALREADY, so it is said as one and never made the subject of another (request 151, E1:
   * "X. is no longer showing as a difference"). The topics come first, each as its own full sentence, and one sentence
   * after them says what became of them.
   */
  const asSentence = (t: string) => {
    const x = t.trim().replace(/^./u, (c) => c.toUpperCase());
    return /[.!?]$/.test(x) ? x : `${x}.`;
  };
  const sentences = (xs: string[]) => xs.map(asSentence).join(' ');
  const parts: string[] = [];
  if (carried.length) {
    parts.push(`${sentences(carried)} ${carried.length === 1 ? 'This is' : 'These are'} still open from last time.`);
  }
  if (gone.length) {
    parts.push(`${sentences(gone)} ${gone.length === 1 ? 'That was' : 'Those were'} a difference last time, and ${gone.length === 1 ? 'it is' : 'they are'} no longer showing as one.`);
  }
  if (fresh.length) {
    parts.push(`${sentences(fresh)} ${fresh.length === 1 ? 'This is' : 'These are'} new this round.`);
  }
  if (now.answered !== before.answered) {
    parts.push(`${now.answered} ${now.answered === 1 ? 'person' : 'people'} answered this round, against ${before.answered} last time.`);
  }

  if (!parts.length) return null;
  /* Full sentences, never a label and a colon (28 Sep 2026). */
  return `This is what changed since the last round. ${parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ')}`;
}
