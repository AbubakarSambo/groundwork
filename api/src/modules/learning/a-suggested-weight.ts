/**
 * WHAT A COUNT SUGGESTS, AND THE ONE SWITCH THAT WOULD APPLY IT (week 8b, decisions 55 and 57.9).
 *
 * A suggested weight is stored beside the counts. It is NOT used. Decision 55 says any change to how
 * patterns are judged is proven on the scenario runs before it is adopted, and big changes go to
 * Hafsah first. So `APPLY_LEARNED_WEIGHTS` is false, in this one place, and nothing that detects a
 * pattern, shows one, chooses a coaching step or orders a probe may ask for a weight except through
 * `theWeightToApply`, which hands back the neutral 1 without looking anything up while the switch is
 * off. A test reads every source file to keep it that way.
 *
 * TO SWITCH IT ON: (1) run the 24 scenarios with the weights applied and score the run against the
 * baseline, proving that no engine-value number drops; (2) take the result to Hafsah; (3) change the
 * constant below to true in the same commit that says so; (4) make the three callers (the pattern
 * detector and its display, the coaching step choice, the probe order) call `theWeightToApply`.
 * Nothing calls it today.
 */
export const APPLY_LEARNED_WEIGHTS = false;

/** Fewer signals than this and a weight stays neutral. One lead's odd week must not move anything. */
export const MIN_SIGNALS_BEFORE_A_WEIGHT_MOVES = 10;

export const NEUTRAL_WEIGHT = 1;
export const LOWEST_WEIGHT = 0.5;
export const HIGHEST_WEIGHT = 1.5;

export interface WhatWasCounted {
  judged: number;
  goodCount: number;
  unsureCount: number;
}

/**
 * Neutral with too little to go on. Otherwise the share that went well, counting "not sure" and
 * "went sideways" as half, spread across 0.5 to 1.5: half right is 1, all right is 1.5, all wrong 0.5.
 */
export function suggestWeight(c: WhatWasCounted): { weight: number; moved: boolean } {
  if (c.judged < MIN_SIGNALS_BEFORE_A_WEIGHT_MOVES) return { weight: NEUTRAL_WEIGHT, moved: false };
  const share = (c.goodCount + 0.5 * c.unsureCount) / c.judged;
  const weight = Math.min(HIGHEST_WEIGHT, Math.max(LOWEST_WEIGHT, LOWEST_WEIGHT + share));
  return { weight: Math.round(weight * 100) / 100, moved: true };
}

/**
 * The only door a caller may use to ask for a weight. With the switch off it returns the neutral
 * weight and does not call `look` at all, so not even a read happens.
 */
export async function theWeightToApply(look: () => Promise<number | null | undefined>): Promise<number> {
  if (!APPLY_LEARNED_WEIGHTS) return NEUTRAL_WEIGHT;
  const w = await look();
  return typeof w === 'number' && Number.isFinite(w) ? w : NEUTRAL_WEIGHT;
}
