import { it, expect } from 'vitest'
import { howARowReads, type ListRow } from './how-a-row-reads'
import { aServedCount } from '@/lib/a-served-count-for-a-spec'

/**
 * WHAT A CHECK-IN NEEDS, AS THE CHECK-INS LIST AND EVERY BOARD'S "THE OTHER BOARDS YOU’RE IN" SAY IT (check-ins.jpg,
 * kwame-board.jpg): "Sales team, Q3, Today’s report ready" for whoever runs a check-in that repeats, once anybody is in
 * and the session's report is not shared yet; "Daniel, the next six weeks, Both accounts in" once the person's and the
 * lead's accounts are both in.
 */
const NOW = new Date('2026-09-23T15:00:00Z')
const day = (n: number) => new Date(Date.UTC(2026, 8, 23 - (38 - n), 13)).toISOString()
const SALES: ListRow = {
  id: 'g1', label: 'Sales team, Q3', status: 'ACTIVE', initiatorId: 'u-w', scenario: 'OKR_ALIGNMENT', cadence: 'DAILY', timelineDays: 60,
  participants: [{ id: 'p-w', userId: 'u-w', partyType: 'INITIATOR', managingOnly: true }, { id: 'p-a', userId: 'u-a' }, { id: 'p-o', userId: 'u-o', user: { firstName: 'Omar', lastName: 'Said' } }],
  checkIns: [
    { participantId: 'p-a', sessionNumber: 38, status: 'COMPLETED', availableFrom: day(38) },
    { participantId: 'p-o', sessionNumber: 38, status: 'NOT_STARTED', availableFrom: day(38) },
  ],
  roundsDone: 37,
  report: { releasedSessions: Array.from({ length: 37 }, (_, i) => i + 1) },
  /* The server's one count, as the list serves it (api this-sessions-count.ts; Hafsah, 30 October 2026). */
  glance: { progress: { answeredThisRound: 1, ofPeople: 2, waitingOn: ['p-o'] } },
  /* And who has answered each session, as the list serves it (wip/assessment's one count), which the row's waiting state reads. */
  theCount: aServedCount({ 38: { on: ['p-a', 'p-o'], answered: ['p-a'] } }),
} as ListRow

it('Wairimu reads that today’s report is ready, not who it waits on', () => {
  expect(howARowReads(SALES, 'u-w', NOW).needs).toEqual({ text: 'Today’s report ready', tone: 'proven' })
})

it('once she has shared it, she reads who it is still waiting on', () => {
  const shared = { ...SALES, report: { releasedSessions: Array.from({ length: 38 }, (_, i) => i + 1) } }
  expect(howARowReads(shared, 'u-w', NOW).needs?.text).toBe('Waiting on Omar')
})

it('a one-time check-in still waits for everybody', () => {
  expect(howARowReads({ ...SALES, cadence: 'ONE_TIME' }, 'u-w', NOW).needs?.text).not.toBe('Today’s report ready')
})

it('a person who takes part never reads it', () => {
  expect(howARowReads(SALES, 'u-a', NOW).needs?.text ?? '').not.toMatch(/report ready/)
})

it('on a check-in about one person, both accounts in reads "Both accounts in"; elsewhere it does not', () => {
  const pip: ListRow = {
    id: 'g2', label: 'Daniel, the next six weeks', status: 'ACTIVE', initiatorId: 'u-w', scenario: 'PIP', cadence: 'WEEKLY', timelineDays: 42,
    participants: [{ id: 'p-w', userId: 'u-w', partyType: 'INITIATOR' }, { id: 'p-d', userId: 'u-d' }],
    checkIns: [{ participantId: 'p-w', sessionNumber: 4, status: 'COMPLETED', availableFrom: day(36) }, { participantId: 'p-d', sessionNumber: 4, status: 'COMPLETED', availableFrom: day(36) }],
    roundsDone: 3, report: { releasedSessions: [1, 2, 3, 4] },
    glance: { progress: { roundsDone: 3, answeredThisRound: 2, ofPeople: 2 } },
  }
  expect(howARowReads(pip, 'u-w', NOW).stands).toBe('Both accounts in')
  /* Even with session 4's report not shared: a check-in about one person has no team report to share. */
  expect(howARowReads({ ...pip, report: { releasedSessions: [1, 2, 3] } }, 'u-w', NOW).needs?.text ?? '').not.toMatch(/report/)
  expect(howARowReads({ ...pip, scenario: 'OKR_ALIGNMENT' }, 'u-w', NOW).stands).not.toBe('Both accounts in')
})
