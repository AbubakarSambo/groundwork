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
 *
 * AND ONCE MEANS ONCE, WHICH THE FIRST VERSION OF THIS DID NOT MANAGE. It was joined into the
 * prompt on every turn of session 1, so the model did as it was told every time. Run live:
 *
 *   turn 5  "You haven't given Sahar or Amina a specific number yet for their parts in the 10,000."
 *   turn 6  "You haven't told Sahar or Amina what you expect them to sell."
 *
 * Twice in consecutive turns, both of them mid-interview, neither of them at a close. The same
 * failure the give-back blocks had: an instruction that is right about WHAT to say and silent about
 * WHEN stops being coaching and becomes nagging. Two conditions now, both in code rather than in
 * the wording: the session has to have reached the point where it could close, and nothing already
 * said this session may be carrying the note.
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
  /** How many answers they have given. A note about the check-in belongs near its close. */
  answersSoFar: number;
  /** Every AI turn this session, so a note already given is not given again. */
  alreadySaidThisSession: string[];
}

/**
 * A NOTE IS NOT GIVEN TWICE, AND THIS IS HOW IT IS RECOGNISED.
 *
 * The model says it in its own words, so there is no exact string to look for. Each note carries a
 * couple of phrases that a turn delivering it is very likely to contain and an ordinary interview
 * question is not, and one hit is enough - the cost of being wrong is a note skipped in a first
 * session, and the cost of being wrong the other way is what she read above.
 */
const ALREADY_SAID = (turns: string[], markers: RegExp[]): boolean =>
  turns.some((t) => markers.some((m) => m.test(t ?? '')));

export function theOneThingToDoBetter(has: WhatTheCheckInHas): string | null {
  if (!has.theyRunIt) return null;
  /* Not on the opener: they have to have said something first. When before the close is the model's to judge (no count). */
  if ((has.answersSoFar ?? 0) < 1) return null;
  const said = has.alreadySaidThisSession ?? [];

  const withNumbers = (has.objectives ?? []).filter((o) => typeof o.target === 'number' && o.target! > 0);
  const whole = withNumbers.filter((o) => !o.ownerParticipantId);
  const parts = withNumbers.filter((o) => !!o.ownerParticipantId);
  const peopleWithOne = new Set(parts.map((p) => p.ownerParticipantId)).size;

  /*
   * HER CASE, AND THE MOST COMMON ONE. An objective for everybody, named people, and nobody given a
   * share of it. Nothing in the check-in can tell any single person whether they are on track.
   */
  if (whole.length && peopleWithOne === 0 && has.peopleInIt > 1) {
    if (ALREADY_SAID(said, [
      /\b(number|target|figure)s? of (their|his|her) own\b/i,
      /\b(their|his|her) own (number|target|figure)\b/i,
      /\bwho carries how much\b/i,
      /\b(have|has)(n't| not) (given|told|set)\b[^.?!]*\b(number|target|how much|what you expect)\b/i,
    ])) return null;
    const n = whole[0].target!.toLocaleString('en-US');
    return `BEFORE THIS SESSION CLOSES, SAY THIS ONCE, IN YOUR OWN WORDS.

This check-in is aiming at ${n} and nobody in it has a number of their own. Deciding who carries how much, and telling them, is the thing to do before the next check-in - without it, nothing here can tell any one person whether they are on track.

One sentence. It is about the check-in, not about them: no praise, no criticism, no list of other things they could also do. Then close.`;
  }

  /* Some people have a number and others do not, which is the same gap half-finished. */
  if (whole.length && peopleWithOne > 0 && peopleWithOne < has.peopleInIt) {
    if (ALREADY_SAID(said, [
      /\b(of|out of) (the )?\d+ people\b/i,
      /\bthe rest (of them )?(a |their )?(number|target)/i,
      /\b(number|target)s? of (their|his|her) own\b/i,
    ])) return null;
    return `BEFORE THIS SESSION CLOSES, SAY THIS ONCE, IN YOUR OWN WORDS.

${peopleWithOne} of ${has.peopleInIt} people have a number of their own. Giving the rest theirs, and telling them, is the thing to do before the next check-in.

One sentence, about the check-in rather than about them, then close.`;
  }

  /* Numbers exist and none of them has a date, so nothing can be late and nothing can be early. */
  if (withNumbers.length && withNumbers.every((o) => !o.dueDate)) {
    if (ALREADY_SAID(said, [
      /\bno date on any\b/i,
      /\bnothing here can be (early|late)\b/i,
      /\bwhen (they|these) are meant to be met\b/i,
    ])) return null;
    return `BEFORE THIS SESSION CLOSES, SAY THIS ONCE, IN YOUR OWN WORDS.

There are numbers on this check-in and no date on any of them. Agreeing when they are meant to be met is the thing to do before the next one - until then nothing here can be early or late.

One sentence, about the check-in rather than about them, then close.`;
  }

  /*
   * NOTHING CHECKABLE. Said last because it is the weakest of the four: it is about how this
   * session went rather than about how the check-in is set up.
   */
  if (!has.anythingDocumented && withNumbers.length) {
    if (ALREADY_SAID(said, [
      /\bcame from memory\b/i,
      /\bsomebody else could open\b/i,
      /\bone thing somebody else could\b/i,
    ])) return null;
    return `BEFORE THIS SESSION CLOSES, SAY THIS ONCE, IN YOUR OWN WORDS.

Everything in this session came from memory. Bringing one thing somebody else could open - a message, a document, a number from a system - is what makes the next check-in worth more than this one.

One sentence, then close.`;
  }

  return null;
}
