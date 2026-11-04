import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WhoIsInThis } from './WhoIsInThis'
import { whoTheSessionCounts, theCountOf } from '../../lib/the-one-count'

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

  /* CHANGED 1 NOVEMBER 2026: everyone on the check-in is counted, as the prototype does (Hafsah approved), and as the server's one count does. */
  it('she is in the count, and the roster names her as not joined', () => {
    /* As the server serves it (its rule is checked in the-one-count-as-every-page-reads-it.spec.ts); the page counts nothing itself. */
    const ground = { theCount: { session: 4, said: null, bySession: { 4: { sessionNumber: 4, onTheCheckIn: ['p-amina', 'p-jared', 'p-hassan'], answered: ['p-hassan'], notYet: ['p-jared'], notJoined: ['p-amina'], declined: [], notLetIn: [] } } } }
    expect(whoTheSessionCounts(people, ground, 4).map((p) => p.id)).toEqual(['p-amina', 'p-jared', 'p-hassan'])
    expect(theCountOf(ground, 4)?.notJoined).toEqual(['p-amina'])
  })
})
