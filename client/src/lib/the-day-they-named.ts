/**
 * THE DAY THE LEAD NAMED FOR THE CHECK-INS (walk fault 5, decision 133).
 *
 * The lead typed "every Monday" in setup and the check-in was saved for Sunday. Setup read the
 * cadence ("weekly") from what she wrote, but never the day: with no day set, the round day comes
 * from the day the check-in starts, and she set it up on a Sunday. This reads the one weekday she
 * named for the check-ins, in her own words, so the saved day is the day she said.
 *
 * Only a day named as the rhythm counts ("every Monday", "each Monday", "on Mondays", "Mondays",
 * "weekly on Monday"); "I spoke to him on Monday" is not a schedule. Two different days named that
 * way is not one answer, so nothing is taken. 0 = Sunday .. 6 = Saturday, as the day picker uses.
 */
const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

export function theDayTheyNamed(texts: (string | null | undefined)[]): number | null {
  const found = new Set<number>()
  for (const raw of texts) {
    const t = (raw ?? '').toLowerCase()
    DAYS.forEach((d, i) => {
      const re = new RegExp(`\\b(?:every|each)\\s+(?:other\\s+)?${d}\\b|\\b(?:on\\s+)?${d}s\\b|\\b(?:weekly|fortnightly|every week|every two weeks)\\s+on\\s+${d}\\b`)
      if (re.test(t)) found.add(i)
    })
  }
  return found.size === 1 ? [...found][0] : null
}
