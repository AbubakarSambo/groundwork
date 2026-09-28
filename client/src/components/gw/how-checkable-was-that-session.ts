/**
 * WHAT A SESSION'S SPECIFICITY LEVEL MEANS, as its own sentence.
 *
 * "Finished 27 Sept 2026 · specific in places" read as one row with two facts in it;
 * "What you said was specific in places." is her own sentence (U.9 review fix 13).
 *
 * U.9 THIRD REVIEW, ITEM 6: THIS NOW READS THE SAME RATING AS THE METER ON THE SESSION ITSELF,
 * NOT A DIFFERENT ONE. This used to take a raw 0-1 score from `getMySpecificity`'s
 * `specificityHistory` - a continuous figure the server keeps for the trend across many sessions -
 * and band it with its own thresholds (>= 0.65, >= 0.35). `HowSpecificThisSessionWas`, the meter a
 * person sees on their own session, reads a *different* field for the *same* session - the stored
 * `specificityLevel` ('managed' | 'vague' | 'directional' | 'specific', see
 * `how-checkable-is-yours-alone.ts`) - through its own bands. The two are computed independently
 * and can land on different sides of a threshold for one real session: walked live, the Report
 * tab's row read "What you said was specific in places." while the meter on that same session read
 * "Mostly general." for the same person's same answers.
 *
 * Those two fields are genuinely different measures of different things (a per-session category
 * versus a continuous score used for a multi-session trend), so making them agree everywhere is an
 * engine question. What this screen can do without touching either engine read is stop citing two
 * different fields for what a reader experiences as one fact about one session - so this now takes
 * the same `specificityLevel` the meter reads, and bands it exactly the way `whereItSits`
 * (HowSpecificThisSessionWas.tsx) does, so the two surfaces can no longer disagree about the same
 * session.
 */
export function howCheckable(level: string | null | undefined): string {
  const l = (level ?? '').toLowerCase()
  if (l === 'specific') return 'What you said was specific enough to check.'
  if (l === 'directional') return 'What you said was specific in places.'
  if (l === 'managed' || l === 'vague') return 'What you said was mostly general.'
  return ''
}
