import { describe, it, expect } from 'vitest'
import { plannedSessionsFor, everySessionDone } from './sessionCount'

/**
 * THE CLIENT AND THE SERVER MUST COUNT A GROUND'S SESSIONS THE SAME WAY.
 *
 * This was computed in three places on the client with two different rules,
 * against a fourth copy on the server (totalSessionsFor) which is the authority
 * - it decides whether another check-in is actually created. The admin page and
 * sidebar rounded UP; the server and the participant page round DOWN.
 *
 * On a ninety-day weekly ground the server plans and creates twelve; the admin
 * page expected thirteen. So a ground that had finished every session it would
 * ever have kept showing "90 days remaining" instead of "every session done",
 * waiting on a thirteenth check-in that nothing would ever create.
 *
 * Found by a journey that ran all twelve sessions and then could not get the
 * page to agree the ground was over - and only findable that way, because both
 * numbers look perfectly reasonable in isolation.
 */

describe('planned sessions, counted the way the server counts them', () => {
  it('rounds down, so a ninety-day weekly ground holds twelve and not thirteen', () => {
    // THE REGRESSION: ceil(90/7) = 13, and the ground could never finish.
    expect(plannedSessionsFor(90, 'WEEKLY')).toBe(12)
  })

  it('agrees with the server across the cadences a ground can be set up with', () => {
    // These are the server's own numbers, from api/src/modules/grounds/session-count.ts.
    expect(plannedSessionsFor(90, 'FORTNIGHTLY')).toBe(6)
    expect(plannedSessionsFor(90, 'MONTHLY')).toBe(3)
    expect(plannedSessionsFor(30, 'DAILY')).toBe(30)
    expect(plannedSessionsFor(90, 'ONE_TIME')).toBe(1)
  })

  it('never returns zero for a ground shorter than one interval', () => {
    // A fortnight on a monthly cadence still holds a check-in. Telling someone
    // their ground has zero sessions would read as broken.
    expect(plannedSessionsFor(14, 'MONTHLY')).toBe(1)
  })

  it('says "unknown" rather than zero when there is no plan to compute', () => {
    // SEQUENTIAL has no clock - the next round fires when the lead checks in.
    // Unknown must not collapse to zero, or a ground reads as finished before it
    // has begun.
    expect(plannedSessionsFor(90, 'SEQUENTIAL')).toBeNull()
    expect(plannedSessionsFor(null, 'WEEKLY')).toBeNull()
    expect(plannedSessionsFor(0, 'WEEKLY')).toBeNull()
    expect(plannedSessionsFor(90, null)).toBeNull()
  })

  it('lets an explicit count set on the ground win', () => {
    expect(plannedSessionsFor(90, 'WEEKLY', 4)).toBe(4)
    // ...including on a cadence that otherwise has no computable plan.
    expect(plannedSessionsFor(90, 'SEQUENTIAL', 3)).toBe(3)
  })
})


/**
 * A GROUND IS FINISHED WHEN THE PERSON FURTHEST BEHIND HAS FINISHED.
 *
 * The old rule counted distinct session NUMBERS marked complete, which is right
 * for one person and wrong for two. The lead finishing session 12 made twelve
 * distinct numbers complete, so the ground announced "every session done" while
 * the participant had never started theirs.
 *
 * The account it closed over is the participant's closing word, on the session
 * the whole record builds toward - the one most likely to change how the ground
 * ends, and the one nobody would notice was missing, because the page said
 * everything was done.
 *
 * Seen live: a green twelve-session run finished 23 of its 24 check-ins and
 * still called itself complete.
 */
const done = (participantId: string, sessionNumber: number) =>
  ({ participantId, sessionNumber, status: 'COMPLETED' })
const open_ = (participantId: string, sessionNumber: number) =>
  ({ participantId, sessionNumber, status: 'NOT_STARTED' })

describe('a ground is done when everyone is done', () => {
  const parties = [{ id: 'lead' }, { id: 'part' }]
  const bothThrough = (upTo: number) =>
    [...Array(upTo)].flatMap((_, i) => [done('lead', i + 1), done('part', i + 1)])

  it('is not done when one party has not finished their last session', () => {
    // THE REGRESSION, exactly as it happened: the lead finishes 12, the
    // participant's 12th is still open, and twelve distinct numbers are complete.
    const checkIns = [...bothThrough(11), done('lead', 12), open_('part', 12)]
    expect(everySessionDone(parties, checkIns, 12)).toBe(false)
  })

  it('is done when both parties have finished all twelve', () => {
    expect(everySessionDone(parties, bothThrough(12), 12)).toBe(true)
  })

  it('is not done when one party is far behind, however far ahead the other is', () => {
    const checkIns = [
      ...[...Array(12)].map((_, i) => done('lead', i + 1)),
      done('part', 1), done('part', 2),
    ]
    expect(everySessionDone(parties, checkIns, 12)).toBe(false)
  })

  it('does not call a ground with no plan finished', () => {
    // SEQUENTIAL and timeline-less grounds have no planned count. Unknown must
    // not read as complete.
    expect(everySessionDone(parties, bothThrough(12), null)).toBe(false)
  })

  it('does not call an empty ground finished', () => {
    expect(everySessionDone([], [], 12)).toBe(false)
    expect(everySessionDone(parties, [], 12)).toBe(false)
  })
})
