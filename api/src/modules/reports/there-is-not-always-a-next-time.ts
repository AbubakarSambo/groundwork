import { GroundScenario } from '@prisma/client';

/**
 * THE SITUATIONS WHERE "WHEN WOULD THIS HAVE COME UP ANYWAY" HAS NO ANSWER.
 *
 * Three of the seven per-situation variants are the same condition asked once, rather than three
 * exceptions bolted onto a sentence.
 *
 * A ONE-OFF READ HAS NO NEXT OCCASION, by design. Its own pack calls it the one situation in the
 * product where a single report is the right shape: no objective, no target, no next session. A
 * counterfactual needs a later, and there is not one.
 *
 * AND A SHOCK HAS ALREADY SURFACED. Something jarring happened and everybody needs the same picture
 * before anybody decides - so the thing this sentence would be about is the reason the check-in
 * exists. Saying when it would have come up on its own would be the product telling somebody their
 * emergency was on a schedule.
 *
 * The third case, a run on its last session, is arithmetic rather than a list, and lives in the
 * read itself.
 */

/** No second sitting, so nothing has a next time. */
export const ONE_SITTING_ONLY = new Set<GroundScenario>([
  GroundScenario.SNAPSHOT,
]);

/** It is already in the open. That is why somebody opened the check-in. */
export const ALREADY_IN_THE_OPEN = new Set<GroundScenario>([
  GroundScenario.ACUTE_SHOCK,
  GroundScenario.CRISIS_ALIGNMENT,
]);
