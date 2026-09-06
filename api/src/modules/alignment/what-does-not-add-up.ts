import { Figure, Period, addUp, money, said, whyTheseCannotBeCompared } from './a-figure-is-a-value-with-a-source';

/**
 * A DIFFERENCE THAT SURVIVES THE CONVERSATION.
 *
 * Somebody notices in a meeting that the numbers do not add up, it gets discussed,
 * and next month nobody remembers there was ever a question. The pattern across
 * months — which is the thing that actually matters — never forms, because the
 * discrepancy only ever existed as a sentence in somebody's head.
 *
 * So a difference is an OBJECT with a state. That is the whole idea.
 *
 * ==========================================================================
 * THE WORDING RULE, WHICH IS NOT DECORATION.
 * ==========================================================================
 *
 * $100,000 unexplained is not $100,000 concealed. It is the second reading that
 * ends a commercial relationship, and it is the reading a reconciliation feature
 * falls into by default — "discrepancy", "shortfall", "under-reported" all carry
 * it. Every sentence this file produces says what the arithmetic shows and stops.
 *
 * The reason is not politeness. In every real case one of these is true far more
 * often than concealment: the periods are cut differently, the basis is different,
 * something is out of scope, or one of the two numbers is simply wrong. A product
 * that reads as accusing is wrong most of the time AND unusable the once it is
 * right, because nobody will put their numbers into it again.
 *
 * ==========================================================================
 * PROPORTION.
 * ==========================================================================
 *
 * A difference of $3,000 on $2m and a difference of $100,000 on $180,000 are not
 * the same event and must not produce the same behaviour. `worthAsking` exists so
 * that a rounding difference does not open an investigation — a product that asks
 * about every cent is one people stop answering, and then it is worthless in the
 * month that matters.
 */

/** What state a difference is in. Nothing here ever reaches "breach" — that is not this product's word. */
export type DifferenceState =
  /** Nobody has explained it yet. The starting state, and not an accusation. */
  | 'not explained yet'
  /** Somebody gave an account of it that covers the amount. */
  | 'explained'
  /** It was explained and the explanation stopped fitting. The most informative state there is. */
  | 'explained before, not now'
  /** The figures changed and it no longer exists. */
  | 'no longer there';

export interface Difference {
  /** What was compared, in the words a person reads. */
  between: string;
  /** stated minus counted. Positive means the stated figure is the larger. */
  minorUnits: number;
  currency: string;
  period: Period;
  state: DifferenceState;
  /** Of the larger of the two figures, as a proportion. Used for judging proportion, never shown as a score. */
  share: number;
}

/** Below this, and below the floor, a difference is not worth anybody's month. */
export const SMALL_ENOUGH_TO_LET_GO = 0.005; // half of one per cent
export const AND_UNDER_MINOR_UNITS = 100_000; // a thousand of the currency unit

/**
 * The arithmetic. Two figures, or a figure against a set of parts.
 *
 * Returns `null` where there is nothing — an exact match is not a difference, and
 * manufacturing one so the feature has something to say is how a product starts
 * finding problems that are not there.
 */
export function whatDoesNotAddUp(
  stated: Figure,
  counted: Figure[],
): { difference: Difference } | { cannot: string } | null {
  const sum = addUp(counted);
  if ('cannot' in sum) return { cannot: sum.cannot };

  const against: Figure = { ...counted[0], minorUnits: sum.total };
  const why = whyTheseCannotBeCompared(stated, against);
  if (why) return { cannot: why };

  const gap = stated.minorUnits - sum.total;
  if (gap === 0) return null;

  const larger = Math.max(Math.abs(stated.minorUnits), Math.abs(sum.total));

  return {
    difference: {
      between: `${stated.says} (${stated.from}) and ${counted.length === 1 ? counted[0].says : `${counted.length} figures added up`}`,
      minorUnits: gap,
      currency: stated.currency,
      period: stated.period,
      state: 'not explained yet',
      share: larger === 0 ? 1 : Math.abs(gap) / larger,
    },
  };
}

/**
 * WHETHER TO RAISE IT AT ALL.
 *
 * Both tests have to fail before it is let go: a small share of a large number can
 * still be a lot of money, and a large share of a small number is usually a
 * rounding artefact. Anything that clears either bar is worth a question.
 */
export function worthAsking(d: Difference): boolean {
  return !(d.share < SMALL_ENOUGH_TO_LET_GO && Math.abs(d.minorUnits) < AND_UNDER_MINOR_UNITS);
}

/**
 * HOW IT IS SAID. Read this next to the rule at the top of the file.
 *
 * Note what is absent: no "should be", no "missing", no "under-reported", no
 * "shortfall", and no direction of blame. The sentence a person reads is the
 * arithmetic and an open question, in that order.
 */
export function howItReads(d: Difference): string {
  const amount = money(Math.abs(d.minorUnits), d.currency);
  const which = d.minorUnits > 0 ? 'the first is larger' : 'the second is larger';
  return (
    `For ${said(d.period)}, ${d.between} do not come to the same amount: ${amount} apart, and ${which}. `
    + 'That difference has not been explained yet. It is very often the periods being cut differently, '
    + 'a different basis, or something out of scope — the people who know are the ones being asked.'
  );
}

/** What a difference must never be said to be, given to any synthesis that reads one. */
export const A_DIFFERENCE_IS_NOT_A_FINDING =
  'A DIFFERENCE IS ARITHMETIC, NOT A CONCLUSION. Never write that money is missing, withheld, '
  + 'concealed, under-reported or owed. Never say a figure is wrong; two figures disagreeing means '
  + 'the difference exists, not that either is false. Never attribute a difference to anybody\'s '
  + 'conduct. Say what the two figures are, what they are apart by, and what has not been explained '
  + 'yet — and if somebody has already explained part of it, say that first.';
