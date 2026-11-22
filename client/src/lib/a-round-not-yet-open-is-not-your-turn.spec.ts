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

/*
 * Since 21 November 2026 the rule is the server's (yourTurnIn in what-needs-you.ts, tested in your-turn-is-the-servers.spec.ts, where a
 * round that opens in a fortnight is not your turn). The list serves its answer on each row, so the rail no longer depends on a date
 * the list may or may not send: it says your turn exactly where the server served one.
 */
describe('a round not yet open is not your turn', () => {
  it('a round that opens in a fortnight wants nothing from you: the server serves no turn', () => {
    const later = new Date(Date.now() + 14 * 86_400_000).toISOString()
    expect(railAttention({ ...ground(later), yourTurn: null } as any, 'u-me').kind).toBe('none')
  })

  it('a round already open is your turn, as served', () => {
    const earlier = new Date(Date.now() - 60_000).toISOString()
    expect(railAttention({ ...ground(earlier), yourTurn: { checkInId: 'c2', sessionNumber: 2, openedAt: earlier } } as any, 'u-me').kind).toBe('yours')
  })

  it('and a row without the date is no longer guessed into your turn', () => {
    const noField = { ...ground(null) }
    delete (noField.checkIns[0] as any).availableFrom
    expect(railAttention(noField as any, 'u-me').kind).not.toBe('yours')
  })
})
