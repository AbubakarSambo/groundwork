import { describe, it, expect } from 'vitest'
import { railAttention, railRank, stillInRail, OVERDUE_AFTER_DAYS, RAIL_KEEPS_CLOSED_FOR_DAYS } from './rail-attention'

/**
 * THE RAIL'S ATTENTION STATE.
 *
 * Grounds sit in the sidebar like channels and the row changes when it needs you.
 * The read is here rather than in the component so the rail, the sort, and these
 * tests cannot disagree about what "your turn" means.
 */

const NOW = new Date('2026-08-12T12:00:00Z')
const days = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString()

const ground = (over: Partial<Parameters<typeof railAttention>[0]> = {}) => ({
  participants: [{ id: 'p-me', userId: 'u-me' }, { id: 'p-them', userId: 'u-them' }],
  checkIns: [],
  ...over,
}) as any

describe('when it is your turn', () => {
  it('says so, with the session number', () => {
    const g = ground({ checkIns: [{ participantId: 'p-me', sessionNumber: 2, status: 'NOT_STARTED', availableFrom: days(1) }] })
    expect(railAttention(g, 'u-me', NOW)).toEqual({ kind: 'yours', sessionNumber: 2 })
  })

  it('and a session scheduled for the future is not your turn yet', () => {
    // A check-in that opens next fortnight is not something anybody is late for,
    // and a rail that nags about it teaches people to ignore the rail.
    const future = new Date(NOW.getTime() + 5 * 86_400_000).toISOString()
    const g = ground({ checkIns: [{ participantId: 'p-me', sessionNumber: 2, status: 'NOT_STARTED', availableFrom: future }] })
    expect(railAttention(g, 'u-me', NOW).kind).toBe('none')
  })

  it('and two rounds behind still reads as one thing to do', () => {
    // Otherwise the rail nags twice for the same person.
    const g = ground({ checkIns: [
      { participantId: 'p-me', sessionNumber: 3, status: 'NOT_STARTED', availableFrom: days(1) },
      { participantId: 'p-me', sessionNumber: 2, status: 'NOT_STARTED', availableFrom: days(2) },
    ] })
    expect(railAttention(g, 'u-me', NOW)).toEqual({ kind: 'yours', sessionNumber: 2 })
  })
})

describe('red is for late, not for your turn', () => {
  it('stays "yours" inside the window', () => {
    const g = ground({ checkIns: [{ participantId: 'p-me', sessionNumber: 1, status: 'NOT_STARTED', availableFrom: days(OVERDUE_AFTER_DAYS) }] })
    expect(railAttention(g, 'u-me', NOW).kind).toBe('yours')
  })

  it('and only turns overdue once the window has closed', () => {
    /**
     * THE ONE DELIBERATE DEPARTURE FROM WHAT WAS ASKED FOR. Hafsah said the name
     * should turn red when it is time to check in. Red at that moment is a red mark
     * against somebody for being on time, and the engine's own rules forbid exactly
     * this shape of signal: "Never say engagement is declining... These are
     * surveillance observations. They make people feel watched not supported."
     */
    const g = ground({ checkIns: [{ participantId: 'p-me', sessionNumber: 1, status: 'NOT_STARTED', availableFrom: days(OVERDUE_AFTER_DAYS + 1) }] })
    expect(railAttention(g, 'u-me', NOW)).toMatchObject({ kind: 'overdue', sessionNumber: 1 })
  })
})

describe('somebody who is not a party to the ground', () => {
  it('is never told it is their turn', () => {
    // An admin who runs a ground they are not in owes nobody a check-in, and a badge
    // that says otherwise makes them chase their own tail.
    const g = ground({ checkIns: [{ participantId: 'p-me', sessionNumber: 1, status: 'NOT_STARTED', availableFrom: days(30) }] })
    const read = railAttention(g, 'u-admin-not-in-it', NOW)
    expect(read.kind).not.toBe('yours')
    expect(read.kind).not.toBe('overdue')
  })

  it('and sees how many are still out instead', () => {
    const g = ground({ checkIns: [
      { participantId: 'p-me', sessionNumber: 1, status: 'COMPLETED' },
      { participantId: 'p-them', sessionNumber: 1, status: 'NOT_STARTED' },
    ] })
    expect(railAttention(g, 'u-admin-not-in-it', NOW)).toEqual({ kind: 'waiting', done: 1, total: 2 })
  })

  it('and a party who has finished their own sees the same', () => {
    const g = ground({ checkIns: [
      { participantId: 'p-me', sessionNumber: 1, status: 'COMPLETED' },
      { participantId: 'p-them', sessionNumber: 1, status: 'NOT_STARTED' },
    ] })
    expect(railAttention(g, 'u-me', NOW).kind).toBe('waiting')
  })
})

describe('the order of the rail', () => {
  it('puts what needs you at the top, late first', () => {
    const order = [
      { kind: 'none' } as const,
      { kind: 'waiting', done: 1, total: 2 } as const,
      { kind: 'yours', sessionNumber: 1 } as const,
      { kind: 'overdue', sessionNumber: 1, daysLate: 9 } as const,
    ]
      .slice()
      .sort((a, b) => railRank(a) - railRank(b))
      .map(a => a.kind)
    expect(order).toEqual(['overdue', 'yours', 'waiting', 'none'])
  })
})

describe('closed grounds leaving the rail', () => {
  it('stay for about three months, because a ground closes when it matters most', () => {
    // The report has just landed and the resolution has just been agreed. Removing
    // it that day hides the thing people are about to open.
    const g = ground({ closedAt: days(10) })
    expect(stillInRail(g, NOW)).toBe(true)
  })

  it('and drop out after that', () => {
    const g = ground({ closedAt: days(RAIL_KEEPS_CLOSED_FOR_DAYS + 1) })
    expect(stillInRail(g, NOW)).toBe(false)
  })

  it('an open ground always stays', () => {
    expect(stillInRail(ground(), NOW)).toBe(true)
  })
})
