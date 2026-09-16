/**
 * "10,000 UNITS" WAS TAKEN AND NOTHING ASKED WHERE IT STANDS TODAY.
 *
 * 3.4 on her list, and the sentence under it is the whole argument: a number with no baseline
 * cannot be checked next session, which is what makes session 2 worth anything. Read on the live
 * run, the lead said "we are aiming at 10,000 units this year" and the conversation moved to the
 * date, the evidence and who else knows. Session 2 opened with no way to say whether 10,000 was
 * near or hopeless, because nobody had ever asked what the number was on the day it was set.
 *
 * THREE THINGS MAKE A NUMBER CHECKABLE, and this asks for the one that is missing:
 *
 *   the number itself      - already taken, by the extraction
 *   the day it is due      - already asked, by a-period-is-not-a-day
 *   where it stands today  - asked by nothing at all until now
 *
 * ONCE PER NUMBER, AND ONLY FOR A NUMBER THAT IS THEIRS TO MOVE. Asking somebody where a colleague's
 * target stands is asking them to report on somebody else, which this product does not do. And
 * asking twice about the same figure is the interrogation people complain about.
 *
 * "I DO NOT KNOW" IS AN ANSWER AND IT IS RECORDED AS ONE. A lead who cannot say where their own
 * headline number stands has told the check-in something worth more than a guess would have been,
 * and pressing past that produces a made-up figure that everything downstream then treats as real.
 */

export interface ANumberOnTheRecord {
  /** What it counts, in their words. */
  name: string;
  target: number;
  /** Whether this number belongs to the person being asked. */
  theirs: boolean;
  /** Whether a starting point has already been said for it. */
  baselineKnown: boolean;
}

/** Did this turn already say where something stands? A figure with a "now" word beside it. */
export function saysWhereItStands(said: string): boolean {
  const t = (said ?? '').toLowerCase();
  if (!/\d/.test(t)) return false;
  /*
   * "AT" ON ITS OWN IS NOT A STANDING. The first version counted any "at 10,000" and so read
   * "we are aiming at 10,000 units this year" - the sentence that SETS the number - as the answer
   * to where it stands, and never asked. Every phrase below says now.
   */
  return /\b(so far|to date|currently|right now|at the moment|as (?:it|things) stand|we(?:'| a)re at|i(?:'| a)m at|stands at|sitting at|done|sold|shipped|closed|delivered|already)\b/.test(t);
}

/**
 * The instruction, or nothing. Handed the numbers on the record and what they have just said.
 */
export function askWhereTheNumberStands(
  numbers: ANumberOnTheRecord[],
  theyJustSaid: string,
): string | null {
  /* They have just told us where something stands, so asking is the thing not to do. */
  if (saysWhereItStands(theyJustSaid)) return null;

  const missing = (numbers ?? []).find((n) => n.theirs && !n.baselineKnown && n.target > 0);
  if (!missing) return null;

  const figure = missing.target.toLocaleString('en-US');
  return `THERE IS A NUMBER ON THIS CHECK-IN WITH NO STARTING POINT, AND THIS IS THE TURN TO ASK FOR IT.

The number is ${figure} for ${JSON.stringify(missing.name)}. Nothing on the record says where that stands today, so nothing next session can say whether it moved.

ASK WHERE IT IS NOW, in one plain question, in your own words. "Where is that today?" or "What is the count at the moment?" is the whole question.

Take whatever they give you. "I do not know" is a real answer and you record it and move on - do not press, do not offer to work it out with them, and never suggest a figure yourself. A number you put in their mouth is the one thing here that is worse than no number.

Ask about this one only. Do not list the others, and do not ask about anything that is somebody else's to move.`;
}
