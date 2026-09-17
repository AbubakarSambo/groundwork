/**
 * THREE PEOPLE NAMED, ONE NUMBER, AND NOBODY ASKED WHO CARRIES WHAT.
 *
 * 3.2 on her list. Her own check-in had Sahar and Amina on it and a 10,000 unit objective with no
 * owners, and the conversation never once asked which part was whose. The close eventually told her
 * it was the thing to fix before the next session, which is right and is a different thing: by then
 * the session is over, and the answer she would have given in the moment is lost.
 *
 * SO IT IS ASKED EARLY, IN THE LEAD'S SESSION, ONCE. It is the lead's to answer - a participant
 * dividing up a colleague's share is the product asking somebody to speak for somebody else - and
 * it is only worth asking where there is something to divide: a number for everybody, real people
 * named, and nobody holding a piece of it.
 *
 * NOT THE SAME AS THE CLOSE. `what-this-session-is-missing` says, at the end, that deciding who
 * carries how much is the thing to do before the next check-in. This asks, in the middle, whether
 * they have already decided. One is a question they can answer now; the other is a note about what
 * to go and do. Where the question gets an answer, the note stops firing, because people then have
 * numbers of their own.
 */

export interface WhatIsOnTheCheckIn {
  /** The whole-team numbers: an objective nobody owns. */
  sharedNumbers: { name: string; target: number | null }[];
  /** How many of the people on the check-in hold a number of their own. */
  peopleWithANumberOfTheirOwn: number;
  /** Everybody being asked, by the name this reader may see. */
  peopleNamed: string[];
  /** Only the person running it is asked this. */
  theyRunIt: boolean;
  /** Has it already been asked this session? */
  alreadyAsked: boolean;
}

const andList = (names: string[]): string =>
  names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;

export function askWhoCarriesWhichPart(has: WhatIsOnTheCheckIn): string | null {
  if (!has.theyRunIt || has.alreadyAsked) return null;
  if (has.peopleWithANumberOfTheirOwn > 0) return null;

  const named = (has.peopleNamed ?? []).filter(Boolean);
  if (named.length < 2) return null;

  const whole = (has.sharedNumbers ?? []).find((n) => typeof n.target === 'number' && (n.target as number) > 0);
  if (!whole) return null;

  const figure = (whole.target as number).toLocaleString('en-US');
  return `NOBODY ON THIS CHECK-IN HOLDS A PART OF THE NUMBER, AND THIS IS THE ONE PERSON WHO CAN SAY WHO DOES.

The check-in is aiming at ${figure} for ${JSON.stringify(whole.name)}. ${andList(named)} are on it, and none of them has a number of their own.

ASK WHO CARRIES WHICH PART. One question, in your own words: how the ${figure} splits between them, or whether it has not been split yet.

BOTH ANSWERS ARE REAL ONES. If they say it, take it. If they say it has not been decided, that is the more useful answer of the two and you record it and move on - do not press, do not propose a split, and never suggest a number for anybody. Splitting somebody's target for them is not this product's to do.

Ask once, and not again this session whatever they say.`;
}

/** Has this question already been put this session? Read off the turns rather than a flag. */
export function alreadyAskedWhoCarriesWhat(aiTurns: string[]): boolean {
  return (aiTurns ?? []).some((t) =>
    /\b(who carries|carries which|how (?:does|do) (?:that|the|it).{0,24}split|split between|each of them.{0,16}(?:number|target)|their (?:own )?(?:share|part) of (?:the|that))\b/i.test(t ?? ''),
  );
}
