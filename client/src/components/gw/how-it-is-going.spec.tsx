import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HowItIsGoing, type Glance } from './how-it-is-going'

/**
 * BOARD REVIEW, 30 SEPTEMBER, TWO PASSES: the rounds line ("1 of 12 rounds are done") and the
 * "answered this round" line ("1 of 1 people have answered") both read as numbers forced to agree
 * with each other rather than as something a person would actually say. This checks every shape
 * named in the second pass.
 */
const glance = (progress: Partial<Glance['progress']> = {}): Glance => ({
  progress: { roundsDone: 5, roundsPlanned: 12, answeredThisRound: 0, ofPeople: 0, ...progress },
  inTheWay: { count: 0, oldest: null, daysWaiting: null },
})

describe('HowItIsGoing: the rounds line', () => {
  it('reads "None of the 12 rounds is done yet." before any round is done', () => {
    render(<HowItIsGoing glance={glance({ roundsDone: 0, roundsPlanned: 12 })} />)
    expect(screen.getByText('None of the 12 rounds is done yet.')).toBeTruthy()
  })
  it('reads "One of the 12 rounds is done." for a single round done, short of the plan', () => {
    render(<HowItIsGoing glance={glance({ roundsDone: 1, roundsPlanned: 12 })} />)
    expect(screen.getByText('One of the 12 rounds is done.')).toBeTruthy()
  })

  it('reads "5 of 12 rounds are done." for more than one, short of the plan', () => {
    render(<HowItIsGoing glance={glance({ roundsDone: 5, roundsPlanned: 12 })} />)
    expect(screen.getByText('5 of the 12 rounds are done.')).toBeTruthy()
  })

  it('reads "One round is done." once the plan is met, with only one round', () => {
    render(<HowItIsGoing glance={glance({ roundsDone: 1, roundsPlanned: 1 })} />)
    expect(screen.getByText('One round is done.')).toBeTruthy()
  })
})

describe('HowItIsGoing: "answered this round", read naturally', () => {
  it('reads "Nobody has answered this round yet." when nobody has', () => {
    render(<HowItIsGoing glance={glance({ answeredThisRound: 0, ofPeople: 6 })} />)
    expect(screen.getByText(/Nobody has answered this round yet\.$/)).toBeTruthy()
  })

  it('reads "The one person in this round has answered." when there is only the one', () => {
    render(<HowItIsGoing glance={glance({ answeredThisRound: 1, ofPeople: 1 })} />)
    expect(screen.getByText(/The one person in this round has answered\.$/)).toBeTruthy()
  })

  it('reads "1 of 6 people has answered this round." - "has", because the subject is "1"', () => {
    render(<HowItIsGoing glance={glance({ answeredThisRound: 1, ofPeople: 6 })} />)
    expect(screen.getByText(/1 of 6 people has answered this round\.$/)).toBeTruthy()
  })

  it('reads "4 of 6 people have answered this round." for more than one, short of everybody', () => {
    render(<HowItIsGoing glance={glance({ answeredThisRound: 4, ofPeople: 6 })} />)
    expect(screen.getByText(/4 of 6 people have answered this round\.$/)).toBeTruthy()
  })

  it('reads "Everybody has answered this round." once everybody has, and there is more than one', () => {
    render(<HowItIsGoing glance={glance({ answeredThisRound: 6, ofPeople: 6 })} />)
    expect(screen.getByText(/Everybody has answered this round\.$/)).toBeTruthy()
  })
})

/**
 * ENGINE MERGE, 2 OCTOBER (REQUEST 117, PART 9): "WAITING SINCE 27 SEPTEMBER", NOT A COUNT THAT
 * CREEPS FORWARD. Read live on "Sales team, Q3": "4 things are in the way, the oldest being the
 * discount decision, waiting 2 days." - `daysWaiting`, which grows by one on every later visit
 * even though nothing on the board has changed. `sinceSays` is drawn from the wait's own clock
 * instead, so the same wait reads the same at any hour.
 */
describe('HowItIsGoing: "in the way", since a fixed day rather than a count that creeps forward', () => {
  it('reads "waiting since 27 September" when the server sends sinceSays', () => {
    render(<HowItIsGoing glance={{
      progress: { roundsDone: 0, roundsPlanned: 12, answeredThisRound: 4, ofPeople: 5 },
      inTheWay: { count: 4, oldest: 'the discount decision', daysWaiting: 2, sinceSays: 'since 27 September' },
    }} />)
    expect(screen.getByText('4 things are in the way, the oldest being the discount decision, waiting since 27 September.')).toBeTruthy()
    expect(screen.queryByText(/waiting 2 days/)).toBeNull()
  })

  it('falls back to the day count when sinceSays is absent', () => {
    render(<HowItIsGoing glance={{
      progress: { roundsDone: 0, roundsPlanned: 12, answeredThisRound: 4, ofPeople: 5 },
      inTheWay: { count: 1, oldest: 'the price list', daysWaiting: 2 },
    }} />)
    expect(screen.getByText('1 thing is in the way, the oldest being the price list, waiting 2 days.')).toBeTruthy()
  })
})
