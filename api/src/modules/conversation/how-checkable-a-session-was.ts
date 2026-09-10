/**
 * HOW CHECKABLE A SESSION WAS: ONE ORDER, ONE MAPPER, ONE SET OF CUTS.
 *
 * Every confidence and specificity label a customer reads traces to one float - a keyword count over
 * what the person said - and that float was mapped, ranked and banded by four functions that
 * disagreed with each other. The mapper put the LOWEST score into `managed`; the report ranked
 * `managed` at 2, above `directional` at 1. So a person who said almost nothing outranked a person
 * who gave a directional answer, on every shared report, since the day it shipped. The zero-turn
 * default returned `vague` for the level and `managed` for all five dimensions - two verdicts about
 * the same nothing. And the sentence at the foot of the report switched on `high`/`low`, values the
 * mapper never emits, so every report with a level printed one constant sentence.
 *
 * This file is the only place the order lives. Worst first, so the index IS the rank:
 * `managed` (nothing checkable was said) < `vague` < `directional` < `specific`. The database
 * enforces the same four values with a CHECK constraint, so the column is enumerated without a
 * migration of every reader to an uppercase enum.
 *
 * The cuts on the mean rank moved with the order (planaudit_b.md A6): under the old ranks `>= 2`
 * meant managed-or-better, which was the bug; under these it would mean directional-or-better,
 * which is a different wrong answer. `>= 2.5` is well covered, `>= 1.5` is partly, else thin.
 */

/** Worst to best. The index is the rank. */
export const SPECIFICITY_LEVELS = ['managed', 'vague', 'directional', 'specific'] as const;
export type SpecificityLevel = (typeof SPECIFICITY_LEVELS)[number];

export function rankOf(level: string | null | undefined): number | null {
  const i = SPECIFICITY_LEVELS.indexOf((level ?? '') as SpecificityLevel);
  return i < 0 ? null : i;
}

/** The one mapper. Monotonic: a higher score is never a lower level. */
export function mapSpecificityLevel(avgScore: number): SpecificityLevel {
  if (avgScore >= 0.6) return 'specific';
  if (avgScore >= 0.35) return 'directional';
  if (avgScore >= 0.15) return 'vague';
  return 'managed';
}

/** Nothing said is the bottom, for the level and for every dimension alike. */
export const NOTHING_SAID: SpecificityLevel = 'managed';

export const WELL_COVERED_AT = 2.5;
export const PARTLY_COVERED_AT = 1.5;

/** The three-word label the party rows carry, from the mean rank. */
export function labelFromMean(mean: number): 'high' | 'moderate' | 'low' {
  return mean >= WELL_COVERED_AT ? 'high' : mean >= PARTLY_COVERED_AT ? 'moderate' : 'low';
}

/**
 * Where these labels come from, said beside them. An English keyword count presented in the grammar
 * of an assessment is the finding that will not survive being explained, so it is explained.
 */
export const WHERE_IT_WAS_READ_FROM =
  'Read from how much of what was said could be checked against a date, a number or a named piece of work - not from anything about the person.';
