import { useEffect, useState } from 'react'

/**
 * ONE SENTENCE, ONE PLACE, FOR EVERY SCREEN THAT WAITS ON A SESSION OPENING.
 *
 * Opening a session runs several model calls before it answers (`ConversationService.open`), which
 * is 14 to 60 seconds of "Opening…" with nothing else said - long enough to read as a hang unless
 * it explains itself. The check-in page (`/checkin/:id`) said so, after four seconds; the check-in's
 * own page (GroundParticipantPage / GroundAdminPage, via GroundChat's "Check in now" button) did
 * not, so a lead's first open there sat on "Opening…" for over 70 seconds with nothing else on
 * screen (U.8 third review). One shared piece now, so a screen that shows the wait cannot forget
 * the sentence, and both say the same thing.
 *
 * U.8 FOURTH REVIEW: "UP TO A MINUTE" WAS NOT TRUE. A real first open was timed at 90 to 130
 * seconds - past the minute the sentence promised, on the ordinary case, not an outlier. "This can
 * take a minute or two" is true of that range; "up to a minute" is not.
 */
/*
 * ONE SHORT LINE, NEVER HOW LONG (Hafsah, 30 October 2026, first-experience round 1). Impatient
 * leads read "This can take a minute or two" as an apology for being slow. The prototype's own
 * waiting state says only what is happening ("Getting the board", F4 small states), so these do
 * the same, and every screen that waits reads them from here.
 */
export const GETTING_YOUR_FIRST_QUESTION_READY = 'Getting your first question.'

/** Said once a reply has been a while coming, in the check-in and in Ask alike. */
export const STILL_READING_WHAT_YOU_WROTE = 'Still reading what you wrote.'

/** True once `active` has been true for `ms` continuously without a break; resets the moment it stops. */
export function useAfterAWhile(active: boolean, ms = 4000): boolean {
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    if (!active) { setSlow(false); return }
    const t = setTimeout(() => setSlow(true), ms)
    return () => clearTimeout(t)
  }, [active, ms])
  return slow
}
