import { waysThrough, type Effort } from '../conversation/a-blocker-is-not-a-blocker-until-you-have-tried';

/**
 * THE WAYS THROUGH, PUT TO THE PERSON WHOSE BLOCKER IT IS.
 *
 * `waysThrough` has existed and been right for a while, and the manager already gets it: the board's
 * `ask` column is drawn from it, so a lead reads "23 days on the finance sign-off, asked once - ask
 * them to speak to Amina rather than write to her."
 *
 * The person themselves got it only as a sentence inside the prompt - "if they are still only
 * waiting, put the ways through to them as options rather than as a telling-off" - and only ever for
 * the FIRST blocker on the list rather than the one that has sat longest. That is an instruction
 * competing with two hundred and seventy-three other instructions, and whether somebody hears it
 * depends on the model that turn. The rule in this codebase is that a guardrail is structural or it
 * is not a guardrail, and the same holds for a recommendation.
 *
 * So it is computed and returned, beside the blocker it belongs to, on their own half of the report.
 *
 * IT IS NOT A TELLING-OFF, AND THE SHAPE CARRIES THAT. Options, plural, in their own order of use;
 * no count of days shouted back at them; nothing about whether they should have done it sooner. The
 * days and the effort are already on the row next to it. And nothing at all for somebody who has
 * escalated or gone around, because they have done the thing this would suggest.
 */
export interface TheirOwnBlocker {
  id: string;
  what: string;
  /** The person who can move it, where the record resolved one. */
  owner: string | null;
  days: number;
  tried: Effort;
  /** No column stores one today; see the note at the call site. */
  chaseBy: Date | null;
}

export interface SomethingToTry {
  id: string;
  what: string;
  /** In the order they are worth doing. Never empty - a row with nothing to suggest is left out. */
  couldTry: string[];
}

/**
 * @param expectThemToUnblock the check-in's own setting. A cohort of new starters with no standing
 *   to chase anybody should not be handed "take it above them" - see the column's note on Ground.
 */
export function whatTheyCouldTry(blockers: TheirOwnBlocker[], expectThemToUnblock: boolean): SomethingToTry[] {
  if (!expectThemToUnblock) return [];
  return blockers
    .filter((b) => b.tried !== 'escalated' && b.tried !== 'went-around')
    .map((b) => ({
      id: b.id,
      what: b.what,
      couldTry: waysThrough({ what: b.what, owner: b.owner, days: b.days, tried: b.tried, chaseBy: b.chaseBy }),
    }))
    .filter((x) => x.couldTry.length > 0)
    /* Longest-standing first, because that is the one where doing nothing has cost the most. */
    .sort((a, b) => (blockers.find((x) => x.id === b.id)?.days ?? 0) - (blockers.find((x) => x.id === a.id)?.days ?? 0));
}
