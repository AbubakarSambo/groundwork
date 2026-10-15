import { describe, it, expect } from 'vitest'
import { railAttention } from './rail-attention'
import { hasEnded, hasStalled, isShut, howItEnded, itRanOutOfTime } from './a-ground-that-has-ended'

/**
 * "YOUR TURN - 12 DAYS LATE", ON A CHECK-IN THAT REFUSED EVERY ANSWER.
 *
 * Nate Peterson, 23 September 2026: "it doesn't seem clear that you can't check in, because all of
 * the involved accounts have things like 'your turn - 12 days late', which would indicate that a
 * user could still check in."
 *
 * They could not. `railAttention` never read the ground's status - it declared `closedAt` and
 * `resolvedAt` in its own input type and used neither - so every ended, held and out-of-time
 * check-in went on asking people for an answer the server would reject.
 */
const twelveDaysAgo = new Date(Date.now() - 12 * 86_400_000).toISOString()
const aGround = (status: string) => ({
  status,
  participants: [{ id: 'p1', userId: 'u1' }],
  checkIns: [{ participantId: 'p1', sessionNumber: 1, status: 'NOT_STARTED', availableFrom: twelveDaysAgo }],
})

describe('what the rail says about a check-in you cannot add to', () => {
  it('nothing, whatever the dates say', () => {
    for (const status of ['STALLED', 'CLOSED', 'RESOLVED', 'PAUSED']) {
      expect(railAttention(aGround(status), 'u1')).toEqual({ kind: 'none' })
    }
  })

  it('and it is still your turn on a live one', () => {
    expect(railAttention(aGround('ACTIVE'), 'u1')).toEqual({ kind: 'overdue', sessionNumber: 1, daysLate: 12 })
    expect(railAttention(aGround('REPORT_READY'), 'u1')).toEqual({ kind: 'overdue', sessionNumber: 1, daysLate: 12 })
  })

  /* A ground with no status at all is a list row from an older build, not a shut check-in. */
  it('and a row with no status is read as live', () => {
    const { status, ...noStatus } = aGround('ACTIVE')
    expect(railAttention(noStatus, 'u1').kind).toBe('overdue')
  })

  /* The two date stamps its own type declared and never read. */
  it('and the stamps it always claimed to read are read', () => {
    expect(railAttention({ ...aGround('ACTIVE'), closedAt: new Date().toISOString() }, 'u1')).toEqual({ kind: 'none' })
    expect(railAttention({ ...aGround('ACTIVE'), resolvedAt: new Date().toISOString() }, 'u1')).toEqual({ kind: 'none' })
  })
})

describe('what the screens call it', () => {
  it('out of time, not ended', () => {
    expect(hasStalled('STALLED')).toBe(true)
    expect(hasEnded('STALLED')).toBe(false)
    expect(isShut('STALLED')).toBe(true)
    expect(howItEnded({ status: 'STALLED' })).toBe('Out of time')
    /* B-020: a full sentence, not "Ended · keep the hire" - see a-ground-that-has-ended.spec.ts. */
    expect(howItEnded({ status: 'CLOSED', endState: 'KEEP' })).toBe('This check-in has ended. The person stays in the role.')
  })

  it('and tells whoever is reading what lifts it', () => {
    expect(itRanOutOfTime(true)).toContain('until you give it more time')
    expect(itRanOutOfTime(false)).toContain('whoever runs it gives it more time')
    for (const said of [itRanOutOfTime(true), itRanOutOfTime(false)]) expect(said).not.toMatch(/\bended\b/i)
  })
})
