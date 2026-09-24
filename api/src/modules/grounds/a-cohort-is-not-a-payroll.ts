import { GroundScenario } from '@prisma/client';

/**
 * A COHORT IS NOT FIVE PEOPLE, AND THE FREE PLAN COUNTED THEM AS STAFF.
 *
 * Testing the asset-loan scenario on 24 September 2026, the run died on the sixth person:
 *
 *   "The free plan covers 5 people, including you, so you can invite 4 others. Subscribe to add
 *    more people."
 *
 * Eight borrowers IS the scenario. COHORT_CHECK is one of the twenty situations the product
 * supports, its whole definition is many people in the same role who do not work together, and on
 * a free organisation it could not be run at all - not run badly, not run partially, refused at
 * creation.
 *
 * THE RULE WAS ALREADY RIGHT SOMEWHERE ELSE. The entry flow grants a cap of 100 the moment nobody
 * is named, because a ground answered on a link is obviously not a payroll. So the cap already
 * follows what KIND of check-in it is - it just followed the route that created it rather than the
 * situation, and a cohort built from a roster took the staff number.
 *
 * WHY THIS IS NOT GIVING AWAY THE PRODUCT. The seat limit exists because a seat is somebody in your
 * organisation who logs in and uses Groundwork. The people in a cohort are the SUBJECT of the
 * check-in - borrowers, field officers on an intake, a class of new starters - and counting them as
 * staff prices the one scenario where the headcount is the point. A pulse across a thousand
 * employees is your staff and stays capped; a cohort is not.
 */

/** What the entry flow already grants a ground answered on a link. */
export const A_COHORT_IS_NOT_A_PAYROLL = 100;

/**
 * The scenarios where the people are the subject rather than the seats.
 *
 * Exactly one, deliberately. COHORT_CHECK's own description is a group of people in the same role,
 * deliberately not influencing each other. Everything else on the list is a team, a pair or a board
 * - people who work for you and who the seat count is honestly about.
 */
const THE_PEOPLE_ARE_THE_SUBJECT: GroundScenario[] = [GroundScenario.COHORT_CHECK];

export function howManyTheFreePlanCovers(
  scenario: GroundScenario | string | null | undefined,
  theDefault: number,
): number {
  return (THE_PEOPLE_ARE_THE_SUBJECT as string[]).includes(String(scenario))
    ? Math.max(theDefault, A_COHORT_IS_NOT_A_PAYROLL)
    : theDefault;
}
