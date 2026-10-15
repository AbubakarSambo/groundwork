import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WhoIsInThis } from './WhoIsInThis'
import { whoIsInRound } from '../../lib/who-is-in-this-round'

/**
 * NIGHT QUALITY RUN 3 (decision 8 redone). Amina Otieno was invited and never joined; Jared Okoth joined
 * and did not check in; Hassan Mwenda checked in. On the check-in page, where the counts are, Amina is said
 * as invited and not joined yet, and she is not in "N of M".
 */
const people = [
  { id: 'p-amina', partyType: 'PARTICIPANT', notJoinedYet: true },
  { id: 'p-jared', partyType: 'PARTICIPANT' },
  { id: 'p-hassan', partyType: 'PARTICIPANT' },
]

describe('invited, not joined yet, on the check-in page', () => {
  it('the roster says it in a full sentence, and never "has not checked in yet" about her', () => {
    render(<WhoIsInThis parties={[
      { name: 'Amina Otieno', done: false, isSelf: false, notJoinedYet: true },
      { name: 'Jared Okoth', done: false, isSelf: false },
      { name: 'Hassan Mwenda', done: true, isSelf: false },
    ]} />)
    expect(screen.getAllByText('Amina Otieno was invited and has not joined yet.').length).toBeGreaterThan(0)
    expect(screen.queryAllByText('Amina Otieno has not checked in yet.')).toHaveLength(0)
    expect(screen.getAllByText('Jared Okoth has not checked in yet.').length).toBeGreaterThan(0)
  })

  it('she is not in the count', () => {
    expect(whoIsInRound(people, 4, null).map((p) => p.id)).toEqual(['p-jared', 'p-hassan'])
    expect(whoIsInRound(people, 4, null, [{ participantId: 'p-hassan', sessionNumber: 4, status: 'COMPLETED' }]).map((p) => p.id)).toEqual(['p-jared', 'p-hassan'])
  })
})
