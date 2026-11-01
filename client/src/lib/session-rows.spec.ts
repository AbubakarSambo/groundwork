import { aServedCount } from './a-served-count-for-a-spec'
import { describe, it, expect } from 'vitest'
import { buildSessionRows, isSessionShared } from './session-rows'

/**
 * SCREEN FAULT 1 (FINAL WALK): `shared` IS READ FROM THE REPORT'S OWN RELEASE, NEVER FROM
 * `roundCompletions`. A round can close (everyone answered) without the lead ever releasing it, and
 * a lead can release a session before the round closes - the two facts must be able to disagree.
 */
describe('isSessionShared', () => {
  it('is false with no report, or a report never released', () => {
    expect(isSessionShared(null, 1)).toBe(false)
    expect(isSessionShared({ releasedAt: null }, 1)).toBe(false)
  })

  it('is true for every session once released, when the report carries no per-session list', () => {
    expect(isSessionShared({ releasedAt: '2026-09-21T10:00:00.000Z' }, 1)).toBe(true)
    expect(isSessionShared({ releasedAt: '2026-09-21T10:00:00.000Z' }, 7)).toBe(true)
  })

  it('is true only for the sessions actually in `releasedSessions`', () => {
    const report = { releasedAt: '2026-09-21T10:00:00.000Z', releasedSessions: [1] }
    expect(isSessionShared(report, 1)).toBe(true)
    expect(isSessionShared(report, 2)).toBe(false)
  })
})

describe('buildSessionRows: `shared` disagrees with `closed` when it must', () => {
  const labelInASentence = (p: any) => p.name ?? 'a colleague'

  it('reads shared: true for a released session even though the round never closed', () => {
    const ground = {
      report: { releasedAt: '2026-09-21T10:00:00.000Z', releasedSessions: [1] },
      participants: [
        { id: 'p1', userId: 'u1', name: 'Rukia Otieno', managingOnly: false },
        { id: 'p2', userId: 'u2', name: 'Omar Haji', managingOnly: false },
      ],
      checkIns: [
        { id: 'c1', participantId: 'p1', sessionNumber: 1, status: 'COMPLETED', isSetup: false, completedAt: '2026-09-20T09:00:00.000Z' },
      ],
      /* Omar never answered - the round is not closed - but the lead released it anyway. */
      roundCompletions: [],
    }
    const rows = buildSessionRows(ground, 'u1', labelInASentence)
    const session1 = rows.find((r) => r.sessionNumber === 1)
    expect(session1?.closed).toBe(false)
    expect(session1?.shared).toBe(true)
  })

  it('reads shared: false for a fully-answered, closed round the lead has not released', () => {
    const ground = {
      report: null,
      participants: [{ id: 'p1', userId: 'u1', name: 'Rukia Otieno', managingOnly: false }],
      checkIns: [
        { id: 'c1', participantId: 'p1', sessionNumber: 1, status: 'COMPLETED', isSetup: false, completedAt: '2026-09-20T09:00:00.000Z' },
      ],
      roundCompletions: [{ sessionNumber: 1, completedAt: '2026-09-20T09:01:00.000Z' }],
    }
    const rows = buildSessionRows(ground, 'u1', labelInASentence)
    const session1 = rows.find((r) => r.sessionNumber === 1)
    expect(session1?.closed).toBe(true)
    expect(session1?.shared).toBe(false)
  })
})

/**
 * BOARD REVIEW, 1 OCTOBER, ITEM 3: THE REPORTS LIST SHOWED A DATE IN THE FUTURE.
 *
 * "Session 2, 6 Oct" (that session's `availableFrom`, the day it was SCHEDULED to open) sat beside
 * that same session's own page saying "Session 2 opened on 30 September" (when the first account
 * in it actually completed). `opened` now reads the earliest `completedAt` among that session's
 * check-ins, the same fact the board's phase-spine timeline already uses; `availableFrom` is kept
 * only as `opensOn`, for a session nobody has started.
 */
describe('buildSessionRows: when a session really opened', () => {
  const labelInASentence = (p: any) => p.name ?? 'a colleague'

  it('reads `opened` from the first completion, not the scheduled availableFrom', () => {
    const ground = {
      participants: [{ id: 'p1', userId: 'u1', name: 'Rukia Otieno', managingOnly: false }],
      checkIns: [
        {
          id: 'c1', participantId: 'p1', sessionNumber: 2, status: 'COMPLETED', isSetup: false,
          availableFrom: '2026-10-06T00:00:00.000Z',
          completedAt: '2026-09-30T09:00:00.000Z',
        },
      ],
      roundCompletions: [],
    }
    const rows = buildSessionRows(ground, 'u1', labelInASentence)
    expect(rows).toHaveLength(1)
    expect(rows[0].opened).toBe('2026-09-30T09:00:00.000Z')
    expect(rows[0].opensOn).toBe('2026-10-06T00:00:00.000Z')
  })

  it('leaves `opened` null and keeps `opensOn` for a session nobody has started', () => {
    const ground = {
      participants: [{ id: 'p1', userId: 'u1', name: 'Rukia Otieno', managingOnly: false }],
      checkIns: [
        { id: 'c1', participantId: 'p1', sessionNumber: 1, status: 'COMPLETED', isSetup: false, availableFrom: null, completedAt: '2026-09-20T09:00:00.000Z' },
        { id: 'c2', participantId: 'p1', sessionNumber: 2, status: 'NOT_STARTED', isSetup: false, availableFrom: '2026-10-06T00:00:00.000Z', completedAt: null },
      ],
      roundCompletions: [],
    }
    const rows = buildSessionRows(ground, 'u1', labelInASentence)
    /* Session 2 has no completion yet, so the numbers filter leaves it out entirely - only session
       1, which is really open, is in the list. */
    expect(rows.map((r) => r.sessionNumber)).toEqual([1])
    expect(rows[0].opened).toBe('2026-09-20T09:00:00.000Z')
  })
})

/**
 * DECISION 77: A ROW'S OWN "N of M checked in" AGREES WITH THE HEADLINE'S COUNT.
 *
 * Read live on "Sales team, Q3": "Session 1, 27 Sept / 4 of 6 checked in" and "Session 2, 30 Sept
 * / 2 of 6 checked in" sat beside the headline's own "4 of 5 people have answered this round." -
 * Faraji Odhiambo, held at the organisation's door (`notLetInYet: true`), was still in `total`
 * (`whoIsInRound`'s own denominator), though the server's own count already left him out. Fixed in
 * `who-is-in-this-round.ts`; this proves the fix reaches `buildSessionRows`'s rows too.
 */
describe('buildSessionRows: somebody not let in yet is not counted', () => {
  const labelInASentence = (p: any) => p.name ?? 'a colleague'

  it('reads "4 of 5" and "2 of 5", never "4 of 6" or "2 of 6", with one person held at the door', () => {
    const ground = {
      participants: [
        { id: 'p-rukia', userId: 'u-rukia', name: 'Rukia Otieno', managingOnly: false },
        { id: 'p-baraka', userId: 'u-baraka', name: 'Baraka Mwangi', managingOnly: false },
        { id: 'p-amani', userId: 'u-amani', name: 'Amani Wekesa', managingOnly: false },
        { id: 'p-neema', userId: 'u-neema', name: 'Neema Achieng', managingOnly: false },
        { id: 'p-colleague', userId: 'u-colleague', name: null, managingOnly: false },
        { id: 'p-faraji', userId: 'u-faraji', name: 'Faraji Odhiambo', managingOnly: false, notLetInYet: true },
      ],
      checkIns: [
        { id: 'c1', participantId: 'p-rukia', sessionNumber: 1, status: 'COMPLETED', isSetup: false, completedAt: '2026-09-27T17:32:00.000Z' },
        { id: 'c2', participantId: 'p-baraka', sessionNumber: 1, status: 'COMPLETED', isSetup: false, completedAt: '2026-09-27T17:39:00.000Z' },
        { id: 'c3', participantId: 'p-amani', sessionNumber: 1, status: 'COMPLETED', isSetup: false, completedAt: '2026-09-27T19:27:00.000Z' },
        { id: 'c4', participantId: 'p-neema', sessionNumber: 1, status: 'COMPLETED', isSetup: false, completedAt: '2026-09-27T17:43:00.000Z' },
        { id: 'c5', participantId: 'p-colleague', sessionNumber: 1, status: 'NOT_STARTED', isSetup: false, completedAt: null },
        { id: 'c6', participantId: 'p-faraji', sessionNumber: 1, status: 'NOT_STARTED', isSetup: false, completedAt: null },
        { id: 'c7', participantId: 'p-rukia', sessionNumber: 2, status: 'COMPLETED', isSetup: false, completedAt: '2026-09-30T12:30:00.000Z' },
        { id: 'c8', participantId: 'p-amani', sessionNumber: 2, status: 'COMPLETED', isSetup: false, completedAt: '2026-09-30T12:30:00.000Z' },
      ],
      roundCompletions: [],
      /* As the server counts it: Faraji, held at the door and not answered, is not counted. */
      answeredBySession: aServedCount({
        1: { on: ['p-rukia', 'p-baraka', 'p-amani', 'p-neema', 'p-colleague'], answered: ['p-rukia', 'p-baraka', 'p-amani', 'p-neema'], notLetIn: ['p-faraji'] },
        2: { on: ['p-rukia', 'p-baraka', 'p-amani', 'p-neema', 'p-colleague'], answered: ['p-rukia', 'p-amani'], notLetIn: ['p-faraji'] },
      }),
    }
    const rows = buildSessionRows(ground, 'u-rukia', labelInASentence)
    const session1 = rows.find((r) => r.sessionNumber === 1)
    const session2 = rows.find((r) => r.sessionNumber === 2)
    expect(session1?.answered).toBe(4)
    expect(session1?.total).toBe(5)
    expect(session2?.answered).toBe(2)
    expect(session2?.total).toBe(5)
    /* Never named as somebody the round is waiting on, either - he was never going to answer. */
    expect(session1?.waitingOn).not.toContain('Faraji Odhiambo')
  })
})

/**
 * ONBOARDING BOARD REVIEW, 3 OCTOBER: TOBI'S ROWS READ "1 of 1 checked in" ON A TWO-PERSON CHECK-IN.
 *
 * `GET /grounds/:id` gives a participant only their own row, so `ground.participants` here has one
 * entry even though both people answered every session. The board's own `GET /grounds/:id/board`
 * sends the full roster - passed in as `fullParticipants` - so a restricted, closed round can read
 * the true "2 of 2", and a restricted, still-open round draws no count at all rather than guess.
 */
describe('buildSessionRows: a restricted roster, given the full one from the board', () => {
  const labelInASentence = (p: any) => p.name ?? 'a colleague'
  const restrictedGround = {
    participants: [{ id: 'p-tobi', userId: 'u-tobi', name: 'Tobi Adewale', managingOnly: false }],
    checkIns: [
      { id: 'c1', participantId: 'p-tobi', sessionNumber: 1, status: 'COMPLETED', isSetup: false, completedAt: '2026-09-26T16:01:00.000Z' },
      { id: 'c2', participantId: 'p-tobi', sessionNumber: 2, status: 'COMPLETED', isSetup: false, completedAt: '2026-09-26T16:05:00.000Z' },
    ],
    roundCompletions: [{ sessionNumber: 1, completedAt: '2026-09-26T16:01:40.000Z' }],
    /* The server counts the whole check-in, whichever rows this reader was sent: both answered session 1, Tobi session 2. */
    answeredBySession: aServedCount({ 1: { on: ['p-tobi', 'p-director'], answered: ['p-tobi', 'p-director'] }, 2: { on: ['p-tobi', 'p-director'], answered: ['p-tobi'] } }),
  }
  const fullParticipants = [
    { id: 'p-tobi', managingOnly: false },
    { id: 'p-director', managingOnly: false },
  ]

  it('reads "2 of 2 checked in" for a closed round, with the full roster passed in', () => {
    const rows = buildSessionRows(restrictedGround, 'u-tobi', labelInASentence, fullParticipants)
    const session1 = rows.find((r) => r.sessionNumber === 1)
    expect(session1?.closed).toBe(true)
    expect(session1?.answered).toBe(2)
    expect(session1?.total).toBe(2)
  })

  /* CHANGED 2 NOVEMBER 2026: the count is the server's (answeredBySession), so a still-open round's count is known, not guessed or
     left out, and it no longer depends on which list of people this page was sent. */
  it('reads "1 of 2" for a still-open round, from the server\'s count', () => {
    const rows = buildSessionRows(restrictedGround, 'u-tobi', labelInASentence, fullParticipants)
    const session2 = rows.find((r) => r.sessionNumber === 2)
    expect(session2?.closed).toBe(false)
    expect(session2?.answered).toBe(1)
    expect(session2?.total).toBe(2)
    expect(session2?.waitingOn).toEqual(['a colleague'])
  })

  it('reads the same count when the board\'s roster is not passed, and never "1 of 1"', () => {
    const rows = buildSessionRows(restrictedGround, 'u-tobi', labelInASentence)
    const session1 = rows.find((r) => r.sessionNumber === 1)
    const session2 = rows.find((r) => r.sessionNumber === 2)
    expect([session1?.answered, session1?.total]).toEqual([2, 2])
    expect([session2?.answered, session2?.total]).toEqual([1, 2])
  })
})

/**
 * SCREEN FAULT 9, PART 2: THE BOARD CALLED TENDAI BOTH "NOT ON ANY OF THESE SESSIONS" AND "NOT
 * YET CHECKED IN", FOR THE SAME SESSION.
 *
 * Tendai joined the check-in after session 1 had already run. The server's own grid
 * (checkInGrid.rows[].cells) correctly says he is not on session 1 ("na"); the served count alone,
 * with no notion of when somebody joined, still counted him as somebody session 1's own round was
 * waiting on. `onSessionFromGrid`, built from that same grid, is what tells `buildSessionRows` the
 * true answer.
 */
describe('buildSessionRows: agrees with the board’s own grid about who joined when', () => {
  const labelInASentence = (p: any) => p.name ?? 'a colleague'
  const ground = {
    participants: [
      { id: 'p-amani', userId: 'u-amani', name: 'Amani Njoroge', managingOnly: false },
      { id: 'p-tendai', userId: 'u-tendai', name: 'Tendai Moyo', managingOnly: false },
    ],
    checkIns: [
      { id: 'c1', participantId: 'p-amani', sessionNumber: 1, status: 'COMPLETED', isSetup: false, completedAt: '2026-09-20T09:00:00.000Z' },
      /* Tendai was added after session 1 closed: no row for him at session 1 at all. */
      { id: 'c2', participantId: 'p-amani', sessionNumber: 2, status: 'COMPLETED', isSetup: false, completedAt: '2026-09-27T09:00:00.000Z' },
      { id: 'c3', participantId: 'p-tendai', sessionNumber: 2, status: 'NOT_STARTED', isSetup: false, completedAt: null },
    ],
    roundCompletions: [],
    /* As the server counts it, which does not know when somebody joined: Tendai is counted on both sessions. */
    answeredBySession: aServedCount({ 1: { on: ['p-amani', 'p-tendai'], answered: ['p-amani'] }, 2: { on: ['p-amani', 'p-tendai'], answered: ['p-amani'] } }),
  }
  /* The server's own grid: Tendai is "na" on session 1 (never on it), and waiting on session 2. */
  const onSessionFromGrid = new Map<string, Set<number>>([
    ['p-amani', new Set([1, 2])],
    ['p-tendai', new Set([2])],
  ])

  it('without the grid, wrongly names Tendai as waited-on for a session he was never on', () => {
    const rows = buildSessionRows(ground, 'u-amani', labelInASentence)
    const session1 = rows.find((r) => r.sessionNumber === 1)
    expect(session1?.waitingOn).toContain('Tendai Moyo')
  })

  it('with the grid, never names Tendai for a session he was not on, and still waits on him for session 2', () => {
    const rows = buildSessionRows(ground, 'u-amani', labelInASentence, null, onSessionFromGrid)
    const session1 = rows.find((r) => r.sessionNumber === 1)
    const session2 = rows.find((r) => r.sessionNumber === 2)
    expect(session1?.waitingOn).not.toContain('Tendai Moyo')
    expect(session1?.total).toBe(1)
    expect(session2?.waitingOn).toContain('Tendai Moyo')
    expect(session2?.total).toBe(2)
  })
})

/* Screen match, 16 October: the board's roster also lists somebody an admin has not let in yet, whom the lead's own ground
   leaves out (decision 77). That is not a restricted read: the lead's own count stays. */
describe('buildSessionRows: a roster that is longer only by somebody not let in yet', () => {
  it('still counts who has checked in, for the lead', () => {
    const ground = {
      participants: [
        { id: 'p-w', userId: 'u-w', name: 'Wairimu', managingOnly: true },
        { id: 'p-a', userId: 'u-a', name: 'Aisha', managingOnly: false },
        { id: 'p-b', userId: 'u-b', name: 'Brian', managingOnly: false },
      ],
      checkIns: [{ id: 'c1', participantId: 'p-a', sessionNumber: 38, status: 'COMPLETED', isSetup: false, completedAt: '2026-09-23T14:00:00.000Z' }],
      roundCompletions: [],
      answeredBySession: aServedCount({ 38: { on: ['p-a', 'p-b'], answered: ['p-a'] } }),
    }
    const full = [...ground.participants, { id: 'p-peter', managingOnly: false }]
    const row = buildSessionRows(ground, 'u-w', (p: any) => p.name ?? 'a colleague', full).find((r) => r.sessionNumber === 38)
    expect(row?.answered).toBe(1)
  })
})
