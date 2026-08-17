/**
 * WHICH SESSION ARE WE ON, ASKED ONCE.
 *
 * The lead's page and the participant's page both drew a roster saying who had checked in and who
 * was still "waiting". On the same ground, at the same moment, signed in as the same person, they
 * disagreed: `/grounds/:id` said "You - waiting, Pat - waiting" while `/grounds/:id/p` said "You -
 * checked in, Pat Party - checked in". Both were reading the same check-ins.
 *
 * The cause was two different fallbacks for the same idea. With no check-in currently open:
 *
 *   participant page:  currentSession = number of completed check-ins   ->  2
 *   lead page:         current        = total sessions planned          ->  6
 *
 * Then each filtered for a completed check-in at `sessionNumber >= current`. At 2 that finds
 * session 2 and reads "checked in". At 6 it finds nothing and reads "waiting". Neither number is
 * the session anybody is on, and they were four apart.
 *
 * This matters more than a wrong label. On this product "waiting" beside somebody's name is close
 * to an accusation - it is the word for a person who has not done a thing they could have done -
 * and the lead's page was the one showing it wrongly, about a person who had in fact written their
 * account twice.
 *
 * So the question is answered in one place, and the answer is the honest one: the session that is
 * open if there is one, otherwise the last session that was actually completed. Never the total,
 * which is a plan rather than a position.
 */
export function whichSessionAreWeOn(
  openSessionNumber: number | null | undefined,
  completedSessionNumbers: number[],
): number {
  if (openSessionNumber != null) return openSessionNumber;
  if (!completedSessionNumbers.length) return 1;
  return Math.max(...completedSessionNumbers);
}

/**
 * Has this person completed their part of the session we are on?
 *
 * `>=` rather than `===` on purpose: a check-in recorded against a later session still counts as
 * having done their part, and the alternative is telling somebody who is ahead that they are behind.
 */
export function hasDoneThisSession(
  theirCheckIns: { sessionNumber?: number | null; status?: string | null }[],
  session: number,
): boolean {
  return theirCheckIns.some(c => (c.sessionNumber ?? 0) >= session && c.status === 'COMPLETED');
}
