/**
 * How many check-ins a ground holds.
 *
 * ONE RULE, ONE PLACE, MATCHING THE SERVER.
 *
 * This was computed in three places on the client with two different rules, and
 * the server has a fourth copy in api/src/modules/grounds/session-count.ts which
 * is the authority - it is what actually decides whether another check-in gets
 * created. The client's admin page and sidebar rounded UP; the server and the
 * participant page round DOWN.
 *
 * On a ninety-day weekly ground those disagree: the server plans and creates
 * twelve, the admin page expects thirteen. So a ground that had genuinely
 * finished every session it would ever have showed "90 days remaining" instead
 * of "every session done", and waited forever for a thirteenth check-in that
 * nothing would ever create. Found by a journey that ran all twelve sessions and
 * then could not get the page to agree the ground was over.
 *
 * Rounding down is the correct rule and the server's: a ninety-day weekly ground
 * holds twelve whole weeks with two days left over, and those two days are not a
 * thirteenth check-in.
 *
 * Keep this in step with the server's totalSessionsFor. If they drift again, the
 * symptom is a ground that can never report itself finished.
 */

const DAYS_BETWEEN: Record<string, number> = {
  DAILY: 1,
  WEEKLY: 7,
  FORTNIGHTLY: 14,
  MONTHLY: 30,
}

export function plannedSessionsFor(
  timelineDays: number | null | undefined,
  cadence: string | null | undefined,
  explicit?: number | null,
): number | null {
  // An explicit count set on the ground wins over anything derived.
  if (explicit != null) return explicit
  if (cadence === 'ONE_TIME') return 1
  // SEQUENTIAL has no clock - the next round fires when the lead checks in, not
  // on a timer - so there is no planned count, and null means "unknown" rather
  // than zero. Treating unknown as zero would call a ground finished before it
  // began.
  const gap = cadence ? DAYS_BETWEEN[cadence] : undefined
  if (!gap || !timelineDays || timelineDays <= 0) return null
  // At least one: a two-week ground on a monthly cadence still holds a check-in,
  // and telling someone they have zero would read as broken.
  return Math.max(1, Math.floor(timelineDays / gap))
}


/**
 * Has EVERY party finished EVERY session the ground plans?
 *
 * The obvious version - count the distinct session numbers marked complete -
 * is wrong on a ground with more than one person in it, and wrong in the
 * direction that matters. Two people on a twelve-session ground: the lead
 * finishes session 12, the participant never starts theirs, and twelve distinct
 * numbers are complete, so the ground announces "every session done" and closes
 * over a missing account.
 *
 * That missing account is the participant's closing word, on the session the
 * whole record builds toward. It is the one most likely to change how the ground
 * ends, and the one nobody would notice was absent - the page said everything
 * was done.
 *
 * Seen live: a green twelve-session run finished 23 of its 24 check-ins and
 * still called itself complete.
 *
 * A ground is done when the person furthest behind has finished.
 */
export function everySessionDone(
  participants: { id: string }[] | null | undefined,
  checkIns: { participantId: string; status: string; sessionNumber: number }[] | null | undefined,
  plannedSessions: number | null,
): boolean {
  if (plannedSessions == null) return false        // no plan means no "finished"
  if (!participants || participants.length === 0) return false
  return participants.every(p => {
    const theirs = new Set(
      (checkIns ?? [])
        .filter(c => c.participantId === p.id && c.status === 'COMPLETED')
        .map(c => c.sessionNumber),
    )
    return theirs.size >= plannedSessions
  })
}
