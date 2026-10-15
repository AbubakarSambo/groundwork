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
 * `peersVisibleToEachOther` is the lead's explicit answer where they have given one. Null means
 * nobody has said, so the family decides.
 *
 * DECISION 17 WINS OVER THE SWITCH. In an evaluation check-in (a performance plan, a promotion or
 * recognition round, a contract renewal, and a probation or first 90 days, decision 75 item 25) the person being reviewed is never told a colleague's
 * name, whatever the lead has switched. The review of 1 October found a lead's "people see each
 * other" on a renewal naming a colleague to the person reviewed.
 *
 * Everything else about the switch is kept. On an evaluation check-in with the switch on, a
 * colleague giving a view is still named to the other colleagues, and still reads their names,
 * because the lead chose that and decision 17 is only about the person reviewed. But only a caller
 * that says who is reading can know the reader is not the person reviewed. A caller that does not
 * say gets "not named" on every evaluation check-in, so the safe answer is the default. Away from
 * evaluation check-ins the switch still wins in both directions, a cohort included. Whoever runs
 * the check-in, the lead or an admin with access, is named everybody by each caller as before.
 */

import { BoardFamily, familyFor } from '../board/board-families';
import { isEvaluationCheckIn, theSubjectOfAnEvaluationCheckIn, type AParticipantForTellingTheSubject } from './is-this-an-evaluation-check-in';

/** Who is reading. `participantId` is their row on this check-in, or null where they have none. */
export interface TheReader {
  participantId: string | null | undefined;
}

/**
 * True where this check-in names people to each other, for this reader.
 *
 * `reader` is optional. Without it, an evaluation check-in never names people to each other,
 * whatever the switch, because the reader might be the person reviewed.
 */
export function peersAreNamedOn(
  ground: {
    scenario?: any;
    peersVisibleToEachOther?: boolean | null;
    participants?: readonly AParticipantForTellingTheSubject[] | null;
  } | null | undefined,
  reader?: TheReader,
): boolean {
  const family = familyFor((ground as any)?.scenario);
  const switched = (ground as any)?.peersVisibleToEachOther as boolean | null | undefined;
  /* The one evaluation list, so a probation (decision 75, item 25) is held to decision 17 too. */
  if (isEvaluationCheckIn((ground as any)?.scenario)) {
    /* Not switched on: nobody is named to each other, as before. */
    if (switched !== true) return false;
    /* Decision 17: the person reviewed is never named a colleague. A caller that does not say who
       is reading cannot rule that out, so it gets the private answer. */
    if (!reader) return false;
    const subject = theSubjectOfAnEvaluationCheckIn((ground as any)?.participants);
    if (!subject) return false;
    return reader.participantId !== subject;
  }
  const evaluative = family === BoardFamily.COHORT;
  return switched ?? !evaluative;
}

/**
 * What the rule would say if nobody had answered it.
 *
 * The grounds page shows a lead both: what is being applied to their check-in now, and what the
 * default for this kind of check-in is, so they can tell "nobody has said" from "somebody chose
 * this". Both answers come from here, so the page cannot show a default this file does not use.
 */
export function peersAreNamedByDefaultOn(ground: { scenario?: any } | null | undefined): boolean {
  return !isEvaluationCheckIn((ground as any)?.scenario) && familyFor((ground as any)?.scenario) !== BoardFamily.COHORT;
}

/**
 * THE READER, BY THEIR SIGN-IN, for a caller that knows who is reading but not their row on this
 * check-in. Their row is looked up among the check-in's own participants; somebody with no row (an
 * admin, a stranger) is `participantId: null`, which is never the person reviewed.
 *
 * The participants must carry `partyType`, and `createdAt` and `managingOnly` where they can, or the
 * person reviewed cannot be told apart from a colleague. A list cut down to the reader alone is safe:
 * the reader is then the only one left to be the person reviewed, so they are told nobody's name.
 */
export function theReaderBySignIn(
  ground: { participants?: readonly any[] | null } | null | undefined,
  userId: string | null | undefined,
): TheReader {
  const mine = userId ? ((ground as any)?.participants ?? []).find((p: any) => p?.userId === userId) : null;
  return { participantId: mine?.id ?? null };
}

/**
 * WHY THE PERSON REVIEWED IS NOT TOLD WHO ELSE GAVE A VIEW, in one plain sentence the screens can show
 * beside the lead's switch. Served on every evaluation check-in, because there the switch never reaches
 * the person reviewed (decision 17).
 */
export const WHY_THE_PERSON_REVIEWED_IS_NOT_TOLD =
  'On a check-in about one person, that person is never told who else gave a view.';

export function whyThePersonReviewedIsNotTold(ground: { scenario?: any } | null | undefined): string | null {
  return isEvaluationCheckIn((ground as any)?.scenario) ? WHY_THE_PERSON_REVIEWED_IS_NOT_TOLD : null;
}
