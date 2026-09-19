/**
 * HOW MANY PEOPLE ONE CHECK-IN HOLDS.
 *
 * The commit refused a twenty-fourth person with "Contributor count exceeds the limit of 20 per
 * check-in. Split into multiple check-ins if needed." The number was a bare literal in the service,
 * and nothing else in the product agreed with it: the labelling rule is written for a convening of
 * forty and was fixed once because the twenty-seventh person came out as "Participant [", and the
 * request body already allows forty names.
 *
 * WHAT IT COST. Read on a real situation, 19 September 2026: one discovery session with ten
 * agroprocessors, ten input distributors and four research organisations - twenty-four people whose
 * accounts are cross-referenced ONCE to decide where to expand. Splitting that into two check-ins
 * does not split the work, it splits the cross-reference, which is the only reason to run it at all.
 *
 * SO THE NUMBER LIVES HERE AND BOTH SIDES READ IT. Forty is not a guess: it is what the labels were
 * built to carry and what the body already accepted. A limit is still right - a check-in with two
 * hundred people in it is a survey, and this product is not one - but it should be one number, in
 * one place, with the reason attached.
 */
/**
 * TWO HUNDRED, BECAUSE A PULSE CHECK IS A WHOLE ORGANISATION.
 *
 * Forty was the number the labels were built for, and it was still too small the same evening it
 * was written: "we can have even 100 contributors, especially when an org is doing a pulse check."
 * A pulse check asks everybody how the work is going, and everybody in a company of a hundred and
 * fifty is a hundred and fifty people. The labelling rule already runs past Z - A to Z, then AA,
 * AB - so the number was the only thing in the way.
 *
 * WHAT STILL LIMITS IT, AND SHOULD. Seats. A hundred people in a check-in is a hundred people on
 * the plan, and that gate is separate, priced, and says so in its own words. This one is only about
 * what shape of thing a single check-in is: past two hundred accounts it stops being a conversation
 * anybody reads and becomes a survey, which this product deliberately is not.
 */
export const HOW_MANY_PEOPLE_ONE_CHECK_IN_HOLDS = 200;

export function tooManyPeopleFor(count: number): string | null {
  return count > HOW_MANY_PEOPLE_ONE_CHECK_IN_HOLDS
    ? `One check-in holds ${HOW_MANY_PEOPLE_ONE_CHECK_IN_HOLDS} people. This one has ${count}. Run it as two check-ins, knowing the report compares the people inside each one.`
    : null;
}
