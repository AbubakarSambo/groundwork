import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage, decisionDuplicatesALeadAction } from './BoardPage'
import { boardApi } from '@/api/board'

/**
 * BOARD REVIEW, SALES PIECE C, ITEM 8: ONE BLOCKER, NOT TWO ITEMS.
 *
 * Found on the running board: the same dependency (Baraka Mwangi, waiting on the lead for the
 * discount decision) drew once as a `leadActions` row ("You need to get back to Baraka Mwangi,
 * who is waiting on you for the discount decision.") and again as a `source: 'blocker'` decision
 * ("Baraka Mwangi is waiting on the discount decision, so it needs deciding."), both under "What
 * needs you in this check-in". The fixture below is the real shape from the review's own API
 * capture (rukia-api.json).
 */
vi.mock('@/stores/auth', () => ({
  useAuthStore: (sel: any) => sel({ user: { id: 'u-lead', firstName: 'Wairimu', role: 'MEMBER' } }),
}))
vi.mock('@/api/board', () => ({ boardApi: { get: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn().mockResolvedValue({ initiatorId: 'u-lead', leadFirstName: 'Wairimu' }) } }))
vi.mock('@/api/today', () => ({ todayApi: { get: vi.fn().mockResolvedValue({ count: 0, line: null, comingUp: [], needs: [] }) } }))
vi.mock('@/components/gw/HowThisHasMoved', () => ({ HowThisHasMoved: () => null }))
vi.mock('@/components/gw/ResolutionPanel', () => ({ ResolutionPanel: () => null }))
vi.mock('@/components/gw/WhatSuccessLooksLike', () => ({ WhatSuccessLooksLikeFor: () => null }))
vi.mock('@/components/gw/TheOtherBoardsYouAreIn', () => ({ TheOtherBoardsYouAreIn: () => null }))
vi.mock('@/components/gw/Suggestions', () => ({ SuggestionsForTheLead: () => null }))

const DEPENDENCIES = [
  {
    id: 'd00f8473-1b51-454c-97dd-a5c8a373e5c3', from: 'Baraka Mwangi', fromParticipantId: 'p-baraka',
    what: 'the discount decision', on: 'You', onParticipantId: 'p-lead', status: 'BLOCKING' as const, then: null,
  },
]

const LEAD_ACTIONS = [
  {
    id: 'waiting-on-the-lead-d00f8473-1b51-454c-97dd-a5c8a373e5c3',
    says: 'You need to get back to Baraka Mwangi, who is waiting on you for the discount decision.',
    because: 'It was first said on 27 September. Nobody has said what has been tried. No time has been given for it.',
  },
]

const DECISIONS = [
  {
    question: 'Baraka Mwangi is waiting on the discount decision, so it needs deciding.',
    why: 'Baraka Mwangi cannot move until this is decided.',
    owner: 'You',
    source: 'blocker' as const,
  },
  {
    question: 'People in this check-in said different things. There are different descriptions of what document signifies that a shop is successfully signed.',
    why: 'What people said about this does not match, so nobody can assume it is agreed.',
    owner: 'You',
    source: 'divergence' as const,
  },
]

const BOARD = {
  groundId: 'g1', renders: true, mode: 'SHARED', family: 'DELIVERY', title: 'Sales team, Q3', scenario: 'OKR_ALIGNMENT',
  coverageVariant: 'text', lastChangedAt: '2026-09-23T15:02:00.000Z',
  sections: ['dependencies', 'decisions'],
  myParticipantId: 'p-lead', canEditFrame: true, readOnlyNote: null,
  participants: [
    { id: 'p-lead', name: 'Wairimu Kamau', role: null, managingOnly: true, signedOffAt: null },
    { id: 'p-baraka', name: 'Baraka Mwangi', role: null, managingOnly: false, signedOffAt: null },
  ],
  dependencies: DEPENDENCIES,
  leadActions: LEAD_ACTIONS,
  decisions: DECISIONS,
}

function renderBoard() {
  ;(boardApi.get as any).mockResolvedValue(BOARD)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds/g1/board']}>
        <Routes><Route path="/grounds/:id/board" element={<BoardPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('decisionDuplicatesALeadAction', () => {
  it('matches a source:"blocker" decision to the lead action for the same dependency', () => {
    expect(decisionDuplicatesALeadAction(DECISIONS[0], LEAD_ACTIONS, DEPENDENCIES)).toBe(true)
  })
  it('never matches a divergence decision', () => {
    expect(decisionDuplicatesALeadAction(DECISIONS[1], LEAD_ACTIONS, DEPENDENCIES)).toBe(false)
  })
  it('does not merge when the dependency has neither a name nor a subject to check', () => {
    const bare = [{ id: 'd00f8473-1b51-454c-97dd-a5c8a373e5c3', from: null, what: null }]
    expect(decisionDuplicatesALeadAction(DECISIONS[0], LEAD_ACTIONS, bare)).toBe(false)
  })
})

describe('"What needs you in this check-in" does not repeat a blocker', () => {
  it('draws Baraka’s discount decision once, as the lead action, not again as a decision', async () => {
    renderBoard()
    await screen.findByRole('heading', { name: 'Sales team, Q3' })
    const section = screen.getByText('What needs you in this check-in').closest('section') as HTMLElement
    expect(within(section).getByText('You need to get back to Baraka Mwangi, who is waiting on you for the discount decision.')).toBeTruthy()
    expect(within(section).queryByText('Baraka Mwangi is waiting on the discount decision, so it needs deciding.')).toBeNull()
    // The unrelated divergence decision is untouched.
    expect(within(section).getByText(/different descriptions of what document signifies/)).toBeTruthy()
  })
})
