/**
 * WHAT A SESSION'S SPECIFICITY SCORE MEANS, said on the row.
 *
 * The thresholds are the ones the bars used, so nothing about the reading changed - only that it
 * is now a phrase rather than a colour, on the session it belongs to. Undefined for a session that
 * has not been read yet, and then the row says nothing rather than guessing.
 */
export function howCheckable(score: number | undefined): string {
  if (score == null) return ''
  if (score >= 0.65) return ' · specific enough to check'
  if (score >= 0.35) return ' · specific in places'
  return ' · little in it that can be checked'
}
