import { whatASalesAimCounts } from '../board/a-sales-aim-is-counted-from-the-deals';
/**
 * "THE GIVE SOMETHING ISN'T REALLY WORKING WELL HERE." PART 5, IN HER WORDS.
 *
 * Three give-backs existed and one rule about them: only one per turn, written after a lead got
 * all three at once and read a briefing. Everything about that rule is right. What was wrong is
 * everything else:
 *
 *   THEY ARE FACTS, NOT READINGS. "Sixty of the hundred and fifty" is a number the person already
 *   knows. A reading is "sixty of a hundred and fifty with three months left, and the two biggest
 *   accounts have no PO".
 *
 *   THEY FIRE RARELY. All three need data the first session does not have, so the session where
 *   somebody most needs a reason to keep going gets nothing.
 *
 *   ONE PER TURN IS RIGHT, ONE PER SESSION IS NOT. A ten-minute conversation that gives back one
 *   fact has not earned anybody's time.
 *
 * SO THIS IS THE FLOOR, NOT A FOURTH BLOCK. It runs when the three better sources have nothing and
 * the session has gone far enough that silence is the answer they are getting. It builds a reading
 * out of what is in front of it and nothing else:
 *
 *   the arithmetic  - the parts against the whole, which no single person can see
 *   the run rate    - what is left, over how long is left, against what has happened so far
 *   the shape       - something they said earlier in this same conversation, set against
 *                     something else they said in it
 *
 * THE BAR IS THE TEST IN HER SENTENCE: they could not have said it themselves. A number they just
 * gave, handed back, fails it. Two numbers they gave, divided by each other, does not.
 */

export interface WhatThisSessionHas {
  /** The whole-team number, if there is one. */
  whole?: { name: string; target: number } | null;
  /** Every individual number on the check-in, including this person's. */
  parts?: { target: number; theirs: boolean }[];
  /** Where this person's own number stands today, if anybody has said. */
  standsAt?: number | null;
  /** This person's own target, if they hold one. */
  theirTarget?: number | null;
  /** Days left before the thing is due. */
  daysLeft?: number | null;
  /** How many turns this person has given. */
  answersSoFar: number;
  /** Has anything been given back this session yet? */
  gaveSomethingAlready: boolean;
  /** Did one of the three better sources fire this turn? */
  somethingBetterFired: boolean;
}

/** The session has gone far enough that giving nothing back IS the answer they are getting. */
const FAR_ENOUGH_IN = 3;

const n = (v: number) => Math.round(v).toLocaleString('en-US');

/**
 * The reading to put to them, or nothing at all.
 *
 * Nothing is the right answer most turns: a better source fired, or it is too early, or there is
 * genuinely nothing here that they do not already hold.
 */
export function somethingTheyCouldNotHaveSaid(has: WhatThisSessionHas): string | null {
  if (has.somethingBetterFired || has.gaveSomethingAlready) return null;
  if ((has.answersSoFar ?? 0) < FAR_ENOUGH_IN) return null;

  const parts = (has.parts ?? []).filter((p) => p.target > 0);

  /*
   * THE ARITHMETIC FIRST, because it is the one reading nobody in the room can do alone: it needs
   * everybody's number at once, and each person only has their own.
   */
  if (has.whole && parts.length >= 2) {
    const sum = parts.reduce((t, p) => t + p.target, 0);
    const short = has.whole.target - sum;
    if (short > 0) {
      return `GIVE THEM THIS, IN ONE SENTENCE, BEFORE YOUR QUESTION.

Every individual number on this check-in adds up to ${n(sum)}. The objective is ${n(has.whole.target)}. That is ${n(short)} short, and nobody can see it from their own number alone.

Say it as a fact about the plan, never as a fact about them: it is not their shortfall, it is the check-in's. Then ask your question.`;
    }
  }

  /*
   * THEN THE RUN RATE, which is two numbers they gave, divided. They know both and have almost
   * never done the division, which is exactly the bar.
   */
  if (has.theirTarget && has.standsAt != null && has.daysLeft && has.daysLeft > 0) {
    const left = has.theirTarget - has.standsAt;
    if (left > 0) {
      const weeks = Math.max(1, Math.round(has.daysLeft / 7));
      const perWeek = Math.ceil(left / weeks);
      return `GIVE THEM THIS, IN ONE SENTENCE, BEFORE YOUR QUESTION.

They are at ${n(has.standsAt)} of ${n(has.theirTarget)}, with about ${weeks} week${weeks === 1 ? '' : 's'} left. That is ${n(perWeek)} a week from here.

It is arithmetic, not a verdict: say the number, do not say whether it is good or bad, and do not tell them what to do about it. Then ask your question.`;
    }
  }

  return null;
}

/**
 * WHERE THEIR OWN NUMBER STANDS (final real-model check, item 16). Mercy was told "You are at 25 of 30 for Mrs Achola, with about 3 weeks
 * left." (25 was Mrs Achola's interest; nothing was sold) and Joseph "You are at 20 units towards the 30 unit target." (Juja Hardware's 20,
 * wanted, not bought). Where their number is a sales aim counted from the deals on record ("units sold by 30 October"), it stands at that
 * count, whatever they said; otherwise at the biggest figure they said beside a word for now, as before.
 */
export function whereTheirNumberStands(theirs: { name?: string | null; count?: number | null } | null, saidBesideNow: number[]): number | null {
  if (theirs && typeof theirs.count === 'number' && whatASalesAimCounts(theirs.name) && whatASalesAimCounts(theirs.name)!.counts !== 'new leads') return theirs.count;
  return saidBesideNow.length ? Math.max(...saidBesideNow) : null;
}
