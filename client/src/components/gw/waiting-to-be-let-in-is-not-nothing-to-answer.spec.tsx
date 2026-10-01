import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WhoIsInThis } from './WhoIsInThis'

/**
 * GROUP 3'S REVIEW, CONTRADICTION 4: WAITING TO BE LET IN IS NOT "NOTHING TO ANSWER YET".
 *
 * Amani's People tab said "Faraji Odhiambo has nothing to answer until the next session opens." -
 * true of somebody waiting on the clock, false of Faraji, who is held outside the organisation by
 * an admin and would have nothing to answer even if the session opened right now. This says what is
 * actually true, without naming who decides (that line belongs to whoever can act on it, on People
 * and setup's own roster).
 */
describe('a colleague waiting to be let in, not waiting on the next session', () => {
  it('reads "is waiting to be let in", even while the next session has not opened', () => {
    render(
      <WhoIsInThis
        parties={[
          { name: 'Faraji Odhiambo', done: false, isSelf: false, waitingToBeLetIn: true },
          { name: 'Amani Wekesa', done: false, isSelf: true },
        ]}
        notOpenYet
      />,
    )
    expect(screen.getByText('Faraji Odhiambo is waiting to be let in.')).toBeTruthy()
    expect(screen.queryByText('Faraji Odhiambo has nothing to answer until the next session opens.')).toBeNull()
    expect(screen.getByText('You have nothing to answer until the next session opens.')).toBeTruthy()
  })

  it('reads "You are waiting to be let in." about yourself', () => {
    render(
      <WhoIsInThis
        parties={[
          { name: 'You', done: false, isSelf: true, waitingToBeLetIn: true },
          { name: 'Amani Wekesa', done: true, isSelf: false },
        ]}
      />,
    )
    expect(screen.getByText('You are waiting to be let in.')).toBeTruthy()
  })
})
