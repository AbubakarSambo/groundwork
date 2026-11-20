import { aServedCount } from './a-served-count-for-a-spec'
import { describe, it, expect } from 'vitest'
import { buildSessionRows } from './session-rows'
import { howManyHere } from '@/pages/org/EveryoneHere'

/**
 * Run 10 (cycle 11): the Reports list read "Check-in 12, 0 of 0 checked in" and "All 12 check-ins" for rounds that opened while Groundwork was paused. The server serves
 * no count for such a round (its one owner), so the list has no row for it; what is left reads true, and "All N check-ins" says N of what is listed.
 */
describe('the Reports list in a pause', () => {
  const ground = {
    participants: [{ id: 'p-sam', userId: 'u-sam', managingOnly: false }, { id: 'p-asha', userId: 'u-asha', managingOnly: false }],
    checkIns: [
      { id: 'c1', participantId: 'p-sam', sessionNumber: 1, status: 'COMPLETED', isSetup: false, completedAt: '2027-01-13T10:00:00.000Z' },
      { id: 'c2', participantId: 'p-asha', sessionNumber: 1, status: 'COMPLETED', isSetup: false, completedAt: '2027-01-13T11:00:00.000Z' },
      { id: 'c3', participantId: 'p-sam', sessionNumber: 2, status: 'COMPLETED', closedReason: 'auto_closed', turns: [], isSetup: false, completedAt: '2027-01-20T10:00:00.000Z' },
      { id: 'c4', participantId: 'p-asha', sessionNumber: 2, status: 'COMPLETED', closedReason: 'auto_closed', turns: [], isSetup: false, completedAt: '2027-01-20T10:00:00.000Z' },
    ],
    roundCompletions: [],
    theCount: aServedCount({ 1: { on: ['p-sam', 'p-asha'], answered: ['p-sam', 'p-asha'] } }),
  }
  it('lists only the round that was sent to anybody, never "0 of 0 checked in"', () => {
    const rows = buildSessionRows(ground, 'u-sam', (p: any) => p.id)
    expect(rows.map((r) => r.sessionNumber)).toEqual([1])
    expect(`${rows[0].answered} of ${rows[0].total} checked in`).toBe('2 of 2 checked in')
  })
})

describe('People, for an organisation with no plan yet', () => {
  it('does not say "on the free plan" of a team the free plan was never given to, as Plan and billing does not', () => {
    expect(howManyHere(4, null, 1, [], [], [], [], null, [], true)).toBe('4 people, with no plan chosen yet, which covers up to 1. That is more people than the plan covers.')
    expect(howManyHere(4, null, 5)).toBe('4 people, on the free plan, which is for up to 5.')
  })
})
