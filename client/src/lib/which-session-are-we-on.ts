import { wasAQuietClose } from './session-rows'
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
/*
 * A SESSION THE CLOCK CLOSED WITH NOTHING SAID IS NOT CHECKING IN (journey round 4, 13 October 2026). Dara
 * Delta never answered anything and People and setup said "Dara Delta has checked in for this session",
 * because a missed session is stored as finished. A missed session is never "checked in".
 */
export function hasDoneThisSession(
  theirCheckIns: { sessionNumber?: number | null; status?: string | null; closedReason?: string | null; turns?: unknown[] | null }[],
  session: number,
): boolean {
  return theirCheckIns.some(c => (c.sessionNumber ?? 0) >= session && c.status === 'COMPLETED' && !wasAQuietClose(c));
}

/**
 * WHICH SESSION THE CHECK-IN ITSELF IS ON - not which one the person reading is on.
 *
 * `whichSessionAreWeOn` answers a question about ONE person: the session they have open, or failing
 * that the last one they finished. That is the right question for "what am I being asked to do".
 *
 * It was also being used to decide the session for the ROSTER - the "who is in this" chips, which
 * are about everybody. Both pages passed their own viewer's open check-in, so a lead who had
 * finished session 2 while nobody else had judged the whole roster against session 1, and the chips
 * said "checked in" beside a counter saying "0 of 2 checked in for session 2". Both were right. On
 * one screen, inches apart, they read as the product losing the record.
 *
 * A round is open until EVERYBODY has finished it, so the session the check-in is on is one past the
 * lowest number anybody has completed. That is the rule the counter already used; this is that rule,
 * in one place, so the two cannot drift apart again.
 *
 * Takes each party's own completed sessions, because that is the shape both pages hold.
 */
export function whichSessionIsThisCheckInOn(
  partiesCompletedSessions: number[][],
  /** How many sessions the check-in has in total, when known. There is no session after the last. */
  plannedSessions?: number | null,
): number {
  if (!partiesCompletedSessions.length) return 1;
  const finishedEach = partiesCompletedSessions.map(sessions => new Set(sessions).size);
  const next = Math.min(...finishedEach) + 1;
  /* A ONE-SESSION CHECK-IN EVERYBODY HAD FINISHED read "waiting" beside all twenty-five names (21 Sep
     2026): the roster was judged against session two, which does not exist. */
  return plannedSessions && plannedSessions > 0 ? Math.min(next, plannedSessions) : next;
}
