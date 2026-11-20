import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { EachAccountSideBySide } from './pictured/TheSituationsSections'

/**
 * THE BOARD SAYS WHO HAS ANSWERED ONCE (fix plan 16 November, group 5; end-to-end I-4). Lucy's board read "3 of 6 have checked in" and, under
 * the section now headed "What each person said", "Waiting. Hasn't answered yet." for people who had. The section worked out who had answered from the grid of
 * check-ins; the sentence came from the one count. Both now read the one count (`theCount`).
 */
const people = ['Lucy', 'Mary', 'Joel', 'Ruth', 'Sam', 'Asha'].map((first, i) => ({ id: `p${i}`, name: `${first} Test` }))
const board = {
  myParticipantId: 'p0',
  participants: people,
  /* The grid has a different last column from the clock's session, which is how the two used to disagree. */
  checkInGrid: { sessions: [1, 2], rows: people.map((p) => ({ participantId: p.id, name: p.name, cells: { 1: 'done', 2: '' } })) },
  theCount: {
    session: 1, planned: 4,
    bySession: { 1: { sessionNumber: 1, onTheCheckIn: people.map((p) => p.id), answered: ['p0', 'p1', 'p2'], notYet: ['p3', 'p4', 'p5'], notJoined: [], declined: [], notLetIn: [] } },
    said: { says: 'Three of the six people have checked in for session 1.', whoSays: null, notJoinedSays: null, notCountedSays: null, everyoneIn: false, othersHaveAnswered: true },
  },
  whoOwnsWhat: [],
}
const text = () => {
  const { container } = render(<QueryClientProvider client={new QueryClient()}><MemoryRouter><EachAccountSideBySide b={board} /></MemoryRouter></QueryClientProvider>)
  return (container.textContent ?? '').replace(/\s+/g, ' ')
}

describe('the lead’s board, who has answered', () => {
  it('shows three people In and three Waiting, the same three the count names', () => {
    const t = text()
    expect(t.match(/Hasn’t answered yet\./g)).toHaveLength(3)
    expect(t.match(/Answered, with no view of the decision on record\./g)).toHaveLength(3)
    expect(t.match(/Waiting/g)).toHaveLength(3)
    /* Those who answered come first, then the three still to answer. */
    expect(t.indexOf('Sam')).toBeGreaterThan(t.indexOf('Joel'))
  })
})
