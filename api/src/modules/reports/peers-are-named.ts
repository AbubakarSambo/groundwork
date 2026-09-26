/**
 * WHETHER THE PEOPLE IN A CHECK-IN ARE NAMED TO EACH OTHER.
 *
 * One rule, in one place. It was written out three times - in the reports service, in the board
 * service and in the grounds service - as the same two lines each time:
 *
 *   const evaluative = [BoardFamily.EVALUATION, BoardFamily.COHORT].includes(familyFor(scenario));
 *   return ground.peersVisibleToEachOther ?? !evaluative;
 *
 * Three copies of a privacy rule is three chances for one of them to fall behind, and the fourth
 * reader of it - the conversation, which builds the prompt the engine actually speaks from - had
 * no copy at all. So the report and the board withheld a colleague's name from the person being
 * reviewed, and the interview said it out loud in the next question.
 *
 * WHAT THE RULE SAYS. In an evaluation check-in - a PIP, a recognition round, a contract renewal -
 * and in a cohort, colleagues stay unnamed to each other by default, because the check-in exists
 * to weigh one person and a colleague's account is not evidence to be put to them with a name on
 * it. Everywhere else people are named to each other by default, because they work together and
 * pretending otherwise makes the product look like it has lost track of who is in the room.
 *
 * `peersVisibleToEachOther` is the lead's explicit answer where they have given one, and it wins
 * in both directions. Null means nobody has said, so the family decides.
 */

import { BoardFamily, familyFor } from '../board/board-families';

/** True where this check-in names people to each other. */
export function peersAreNamedOn(
  ground: { scenario?: any; peersVisibleToEachOther?: boolean | null } | null | undefined,
): boolean {
  const evaluative = [BoardFamily.EVALUATION, BoardFamily.COHORT].includes(
    familyFor((ground as any)?.scenario),
  );
  return (ground as any)?.peersVisibleToEachOther ?? !evaluative;
}

/**
 * What the rule would say if nobody had answered it.
 *
 * The grounds page shows a lead both: what is being applied to their check-in now, and what the
 * default for this kind of check-in is, so they can tell "nobody has said" from "somebody chose
 * this". Both answers come from here, so the page cannot show a default this file does not use.
 */
export function peersAreNamedByDefaultOn(ground: { scenario?: any } | null | undefined): boolean {
  return ![BoardFamily.EVALUATION, BoardFamily.COHORT].includes(familyFor((ground as any)?.scenario));
}
