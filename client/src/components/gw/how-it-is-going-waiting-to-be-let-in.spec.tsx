import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HowItIsGoing, type Glance } from './how-it-is-going'

const glance = (progress: Partial<Glance['progress']> = {}): Glance => ({
  progress: { roundsDone: 5, roundsPlanned: 12, answeredThisRound: 0, ofPeople: 0, ...progress },
  inTheWay: { count: 0, oldest: null, daysWaiting: null },
})

/**
 * DECISION 77: "FARAJI ODHIAMBO IS WAITING TO BE LET IN.", BESIDE THE COUNT, NEVER INSIDE IT.
 * Sent only to whoever runs the check-in, the admin who set it up, or an admin with access -
 * null for everybody else, including with nobody held at the door.
 */
describe('HowItIsGoing: waitingToBeLetIn, a muted note under the count', () => {
  it('draws it under the headline count when sent', () => {
    render(<HowItIsGoing glance={glance({ answeredThisRound: 4, ofPeople: 4 })} waitingToBeLetIn="Faraji Odhiambo is waiting to be let in." />)
    expect(screen.getByText('Faraji Odhiambo is waiting to be let in.')).toBeTruthy()
  })

  it('draws nothing when the server sends null', () => {
    render(<HowItIsGoing glance={glance({ answeredThisRound: 4, ofPeople: 4 })} waitingToBeLetIn={null} />)
    expect(screen.queryByText(/waiting to be let in/)).toBeNull()
  })
})
