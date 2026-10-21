/**
 * AN APOLOGY IS NOT OWED, AND IT IS NOT MET WITH SILENCE.
 *
 * Run 11, the loan cohort: "I'm sorry. I will pay." And the close: "Your report is ready now."
 * Somebody who thinks they are being judged has just said sorry to a check-in, and the check-in
 * moved on to its filing. The judge scored the session 1 for how that felt, and named this line.
 *
 * The product writes the answer, not the model: it is one sentence, it is always true, and a model
 * asked for warmth here tends to produce a paragraph. It goes in front of the close, once, only where
 * the last thing they said was an apology.
 */
export const IS_AN_APOLOGY = /\b(i'?m sorry|i am sorry|sorry|forgive me|my apologies|apologies|i apologise|i apologize)\b/i;

export const NOTHING_TO_APOLOGISE_FOR = 'No need to say sorry here. This is a record of where things are, not a judgement of you.';
/** With the direct morning on (email/a-direct-email.ts): the same, without explaining what the record is. */
export const NOTHING_TO_APOLOGISE_FOR_DIRECTLY = 'No need to say sorry.';

export function isAnApology(said: string): boolean {
  return IS_AN_APOLOGY.test(said ?? '');
}
