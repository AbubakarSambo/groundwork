/**
 * WHAT A SESSION'S SPECIFICITY SCORE MEANS, as its own sentence.
 *
 * The thresholds are the ones the bars used, so nothing about the reading changed - only that it
 * is now a full sentence of its own rather than a phrase stitched to the row with a dot (U.9
 * review fix 13: "Finished 27 Sept 2026 · specific in places" read as one row with two facts in
 * it; "What you said was specific in places." is her own sentence). Undefined for a session that
 * has not been read yet, and then the row says nothing rather than guessing.
 */
export function howCheckable(score: number | undefined): string {
  if (score == null) return ''
  if (score >= 0.65) return 'What you said was specific enough to check.'
  if (score >= 0.35) return 'What you said was specific in places.'
  return 'There was little in what you said that can be checked.'
}
