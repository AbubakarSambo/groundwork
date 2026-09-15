/**
 * "THE FIRST SESSION GIVES ME AN INSIGHT INTO SOMETHING I NEED TO DO BETTER."
 *
 * Her words, and her own example: "like setting the targets per person and telling them".
 *
 * WHY NOTHING SAID IT. The coach can only speak where a step is ALREADY OUTSTANDING from an
 * earlier session - `coachingBlock` returns nothing otherwise, and rightly, because a coach asking
 * about a step it has not yet given is nonsense. A step chosen at the end of session 1 is stored
 * and first spoken in session 2. So the first conversation, where somebody is most reachable and a
 * gap costs least to fix, says nothing at all.
 *
 * This is the session-1 source. Not a pattern - there is no history yet - but what is MISSING from
 * the check-in in front of it, which is all countable:
 *
 *   an objective nobody has been given a share of, while people are named
 *   individual numbers that do not reach the objective
 *   a target with no date
 *   nothing said that anybody else could open
 *
 * ONE LINE, AT THE CLOSE, ABOUT THE CHECK-IN. Not about the person, not a list, and nothing at all
 * where the check-in is in good shape - a first session that ends in a lecture is worse than one
 * that ends quietly.
 */

export interface WhatTheCheckInHas {
  /** Every objective on the check-in, owned and unowned. */
  objectives: { name: string; target: number | null; ownerParticipantId?: string | null; dueDate?: Date | string | null }[];
  /** People being asked, not counting anybody managing only. */
  peopleInIt: number;
  /** Is this person the one who runs it - the lecture is only ever theirs to receive. */
  theyRunIt: boolean;
  /** Did anything they said this session point at something another person could open. */
  anythingDocumented: boolean;
}

export function theOneThingToDoBetter(has: WhatTheCheckInHas): string | null {
  if (!has.theyRunIt) return null;

  const withNumbers = (has.objectives ?? []).filter((o) => typeof o.target === 'number' && o.target! > 0);
  const whole = withNumbers.filter((o) => !o.ownerParticipantId);
  const parts = withNumbers.filter((o) => !!o.ownerParticipantId);
  const peopleWithOne = new Set(parts.map((p) => p.ownerParticipantId)).size;

  /*
   * HER CASE, AND THE MOST COMMON ONE. An objective for everybody, named people, and nobody given a
   * share of it. Nothing in the check-in can tell any single person whether they are on track.
   */
  if (whole.length && peopleWithOne === 0 && has.peopleInIt > 1) {
    const n = whole[0].target!.toLocaleString('en-US');
    return `BEFORE THIS SESSION CLOSES, SAY THIS ONCE, IN YOUR OWN WORDS.

This check-in is aiming at ${n} and nobody in it has a number of their own. Deciding who carries how much, and telling them, is the thing to do before the next check-in - without it, nothing here can tell any one person whether they are on track.

One sentence. It is about the check-in, not about them: no praise, no criticism, no list of other things they could also do. Then close.`;
  }

  /* Some people have a number and others do not, which is the same gap half-finished. */
  if (whole.length && peopleWithOne > 0 && peopleWithOne < has.peopleInIt) {
    return `BEFORE THIS SESSION CLOSES, SAY THIS ONCE, IN YOUR OWN WORDS.

${peopleWithOne} of ${has.peopleInIt} people have a number of their own. Giving the rest theirs, and telling them, is the thing to do before the next check-in.

One sentence, about the check-in rather than about them, then close.`;
  }

  /* Numbers exist and none of them has a date, so nothing can be late and nothing can be early. */
  if (withNumbers.length && withNumbers.every((o) => !o.dueDate)) {
    return `BEFORE THIS SESSION CLOSES, SAY THIS ONCE, IN YOUR OWN WORDS.

There are numbers on this check-in and no date on any of them. Agreeing when they are meant to be met is the thing to do before the next one - until then nothing here can be early or late.

One sentence, about the check-in rather than about them, then close.`;
  }

  /*
   * NOTHING CHECKABLE. Said last because it is the weakest of the four: it is about how this
   * session went rather than about how the check-in is set up.
   */
  if (!has.anythingDocumented && withNumbers.length) {
    return `BEFORE THIS SESSION CLOSES, SAY THIS ONCE, IN YOUR OWN WORDS.

Everything in this session came from memory. Bringing one thing somebody else could open - a message, a document, a number from a system - is what makes the next check-in worth more than this one.

One sentence, then close.`;
  }

  return null;
}
