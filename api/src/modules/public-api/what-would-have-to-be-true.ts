/**
 * A DEFINITION OF DONE THAT SURVIVES THE SESSION IT WAS AGREED IN.
 *
 * "By end of Q2, vehicle-control software supports five core scenarios reliably in production" is
 * one sentence and five separate things. Nothing could hold the five, so every check-in re-argued
 * what "done" meant and the report could say the accounts differed without ever being able to say
 * two of five.
 *
 * WHY MARKING ONE MET NEEDS A REASON. A tick with nothing behind it is the "shipped" problem in a
 * smaller box: somebody's honest belief that a thing is finished, recorded as a fact, and read
 * later by a person who cannot check it. Requiring a sentence does not make the sentence true - it
 * makes the belief and the evidence for it visible in the same place, which is the whole of what
 * this product does anywhere else.
 *
 * AND IT DOES NOT DECIDE ANYTHING. Two of five is a count, not a verdict. What that means about
 * whoever owns it is a question for the person reading, and this deliberately supplies no answer.
 */

export interface Criterion {
  text: string;
  ordinal: number;
  metAt: Date | null;
  metBecause: string | null;
}

export interface WhereItStands {
  met: number;
  total: number;
  /** Said in the report and to the API's caller. Empty when there are no criteria at all. */
  says: string[];
}

export const NEEDS_A_REASON =
  'Say what showed this was met. A criterion ticked with nothing behind it records somebody\'s '
  + 'belief as a fact, which is the thing acceptance criteria exist to stop.';

/** Refused rather than silently accepted: an empty reason is the same as no reason. */
export function mayMarkMet(because: string | null | undefined): { may: boolean; why?: string } {
  return because?.trim() ? { may: true } : { may: false, why: NEEDS_A_REASON };
}

export function whereItStands(criteria: Criterion[]): WhereItStands {
  const total = criteria.length;
  if (!total) return { met: 0, total: 0, says: [] };

  const inOrder = [...criteria].sort((a, b) => a.ordinal - b.ordinal);
  const met = inOrder.filter((c) => c.metAt !== null).length;

  const says = [`${met} of ${total} met.`];

  /*
   * THE ONES THAT ARE NOT, BY NAME. "Three of five" tells somebody how much is left and nothing
   * about what, and what is the only part they can act on.
   */
  const outstanding = inOrder.filter((c) => c.metAt === null);
  if (outstanding.length) {
    says.push(`Still open: ${outstanding.map((c) => `"${c.text}"`).join('; ')}.`);
  }

  /*
   * AND WHAT WAS ACCEPTED AS SHOWING THE REST. A reader who cannot check the work themselves can
   * at least see what somebody accepted as proof, and decide whether they would have.
   */
  const done = inOrder.filter((c) => c.metAt !== null && c.metBecause?.trim());
  if (done.length) {
    says.push(...done.map((c) => `"${c.text}" was marked met on the strength of: ${c.metBecause!.trim()}`));
  }

  return { met, total, says };
}

/** Given to the synthesis with the counts, for the same reason the other refusals are. */
export const NEVER_CONCLUDE_FROM_CRITERIA =
  'WHAT A COUNT OF CRITERIA IS NOT. Two of five met is a count of what has been agreed and shown, '
  + 'never a measure of anybody. It does not say whether the remaining three are late, whether the '
  + 'ones marked met were marked fairly, or whether the five were the right five - somebody chose '
  + 'them, and they may have chosen badly or too easily. Never write that a person is behind, '
  + 'on track, or performing at any level on the strength of this number.';
