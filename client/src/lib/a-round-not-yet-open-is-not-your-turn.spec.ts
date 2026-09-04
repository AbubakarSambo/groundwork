import { describe, it, expect } from 'vitest'
import { railAttention } from './rail-attention'

/**
 * THE RAIL'S RULE WAS RIGHT AND THE DATA MADE IT IMPOSSIBLE TO FOLLOW.
 *
 * `railAttention` states it plainly: "a session scheduled for next fortnight is not something
 * anybody is late for". It reads `availableFrom` to know. The LIST endpoint did not return that
 * field - only the detail endpoint did - so every surface fed by the list saw `undefined` and read
 * a round opening in two weeks as "your turn".
 *
 * That was invisible while the rail's chip was decoration. It stopped being invisible when the
 * dashboard cards started saying the same thing in words: ten check-ins all claiming to need you,
 * on a day none of them did.
 *
 * Found by putting the same rule on a second surface and watching the two disagree - the ground
 * page said nothing was due while the card beside it said "Your turn", which is the shape of a data
 * problem rather than a logic one.
 */
const ground = (availableFrom: string | null) => ({
  id: 'g1',
  participants: [{ id: 'p-me', userId: 'u-me' }, { id: 'p-them', userId: 'u-them' }],
  checkIns: [{ participantId: 'p-me', sessionNumber: 2, status: 'NOT_STARTED', availableFrom }],
})

describe('a round not yet open is not your turn', () => {
  it('a round that opens in a fortnight wants nothing from you', () => {
    const later = new Date(Date.now() + 14 * 86_400_000).toISOString()
    expect(railAttention(ground(later) as any, 'u-me').kind).toBe('none')
  })

  it('a round already open is your turn', () => {
    const earlier = new Date(Date.now() - 60_000).toISOString()
    expect(railAttention(ground(earlier) as any, 'u-me').kind).toBe('yours')
  })

  it('and the field being ABSENT is what produced the wrong answer', () => {
    /*
     * This is the defect, expressed as a test. With the date missing the rule cannot tell a
     * scheduled round from an open one, and falls to "yours" - which is the safe default for a
     * rule, and the wrong answer for a person. The fix is in the API select, not here.
     */
    const noField = { ...ground(null) }
    delete (noField.checkIns[0] as any).availableFrom
    expect(railAttention(noField as any, 'u-me').kind).toBe('yours')
  })
})
