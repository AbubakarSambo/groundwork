/**
 * A NUMBER BESIDE A CLAIM, WHICH IS THE ONLY EVIDENCE HERE THAT IS NOT SOMEBODY'S ACCOUNT.
 *
 * Everything else this product weighs is a description: what a person says happened, what a
 * colleague says happened, what a document says was agreed. All of it is worth having and none of
 * it settles an argument between two people who each believe themselves.
 *
 * "The product is stable" beside "crash rate 8 percent, three active vehicles" is a conversation
 * nobody could otherwise have - not because the number wins, but because it is the first thing in
 * the room that neither person wrote.
 *
 * IT DOES NOT ARGUE, AND THE WORDING IS THE WHOLE SAFEGUARD. A metric that contradicts somebody
 * cannot be allowed to read as catching them out. It might be measuring the wrong thing, covering
 * the wrong window, or counting something the person was not talking about - and the person is
 * usually the one who knows which. So it is stated, attributed, dated, and turned into a question.
 *
 * IT IS NOT ANALYTICS AND MUST NOT BECOME ANALYTICS. No trends, no comparisons between periods, no
 * thresholds, no "good" and "bad". The moment this file decides 8 percent is high it has become a
 * product analytics tool with opinions, and a worse one than whatever the customer already runs.
 */

export interface Metric {
  key: string;
  says: string;
  value: number;
  unit: string | null;
  asOf: Date;
  sourceSystem: string;
}

/** How a metric is said. Nothing here judges the number. */
export function howItReads(m: Metric): string {
  const unit = m.unit?.trim() ? ` ${m.unit.trim()}` : '';
  const when = m.asOf.toISOString().slice(0, 10);
  return `${m.says}: ${m.value}${unit}, as of ${when}, from ${m.sourceSystem}.`;
}

/**
 * SAID WITH THEM, EVERY TIME.
 *
 * A list of numbers under a heading in a report about a person reads as a case against them within
 * about a second, whatever the numbers are. These three sentences are the difference between
 * evidence and an ambush, and they are not decoration.
 */
export const WHAT_A_NUMBER_IS_NOT = [
  'These came from your own systems and nobody here has checked them.',
  'A number that disagrees with somebody is not proof they were wrong. It may be measuring'
    + ' something else, over a different period, or counting something they were not talking about.',
  'Nothing here says whether a number is good. That depends on what you were aiming for, which is'
    + ' not something this can know.',
];

/** Given to the synthesis alongside the numbers. */
export const NEVER_CONCLUDE_FROM_A_NUMBER =
  'WHAT A METRIC CANNOT TELL YOU. It cannot tell you that somebody was wrong, that they knew and '
  + 'said otherwise, or that a number is good or bad - you have not been told what anybody was '
  + 'aiming for. Where a number and an account do not line up, say both and ask about the gap. '
  + 'Never write that a claim is contradicted, overstated or false on the strength of a number, '
  + 'and never rank or score anybody using one.';

/**
 * WHERE A NUMBER AND A CLAIM DO NOT LINE UP, AS A QUESTION.
 *
 * Deliberately not a comparison: this does not know what the claim asserted numerically, and
 * building something that guessed would be exactly the invention the rest of the product refuses.
 * It puts the two beside each other and asks the person who knows.
 */
export function worthAsking(claim: string, m: Metric): string {
  return `The record says: "${claim.trim()}". Your systems say: ${howItReads(m)} Those may be about`
    + ' different things, or the same thing measured differently. Which is it?';
}
