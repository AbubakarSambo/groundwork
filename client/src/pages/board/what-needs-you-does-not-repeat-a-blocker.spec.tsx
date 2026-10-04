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

  /*
   * PROJECT BOARD REVIEW 1, FIX 1: "nobody-named-" ROWS DUPLICATE TOO. The real fixture
   * (eng-lead-1440, NEW_PROJECT 555ac67d) shows the lead reading both "You need to find out who
   * can provide owners with dates for the API format and the data structure, because nobody has
   * been named yet..." (a `leadActions` row, id `nobody-named-9b41fa1c-...`) and "You are waiting
   * for owners with dates for the API format and the data structure, and nobody has been named to
   * provide it." (the matching `source: 'blocker'` decision). The dependency's `from` here is the
   * lead's own name (Wanjiru Lead), so the decision reads "You", not the name - the match needs
   * the reader's own name to see through that.
   */
  const NOBODY_NAMED_DEPENDENCIES = [
    { id: '9b41fa1c-16b6-45db-959b-4d33b154341a', from: 'Wanjiru Lead', what: 'owners with dates for the API format and the data structure' },
    { id: '06023673-d3fb-43ab-bc5c-59a6f95504c1', from: 'Aisha Wanjiku', what: 'the data structure decision' },
  ]
  const NOBODY_NAMED_LEAD_ACTIONS = [
    { id: 'nobody-named-9b41fa1c-16b6-45db-959b-4d33b154341a', says: 'You need to find out who can provide owners with dates for the API format and the data structure, because nobody has been named yet. That waits on a decision on who owns them.' },
    { id: 'nobody-named-06023673-d3fb-43ab-bc5c-59a6f95504c1', says: 'You need to find out who can provide the data structure decision Aisha Wanjiku is waiting for, because nobody has been named yet.' },
  ]
  const NOBODY_NAMED_DECISIONS = [
    { question: 'You are waiting for owners with dates for the API format and the data structure, and nobody has been named to provide it.', why: 'You cannot move until it comes.', owner: 'Nobody has been named to provide it.', source: 'blocker' as const },
    { question: 'Aisha Wanjiku is waiting on the data structure decision, so it needs deciding.', why: 'Aisha Wanjiku cannot move until this is decided.', owner: 'Nobody has been named to decide this.', source: 'blocker' as const },
  ]

  it('matches a "nobody-named-" lead action for the lead\'s own wait, read as "You"', () => {
    expect(decisionDuplicatesALeadAction(NOBODY_NAMED_DECISIONS[0], NOBODY_NAMED_LEAD_ACTIONS, NOBODY_NAMED_DEPENDENCIES, 'Wanjiru Lead')).toBe(true)
  })
  it('matches a "nobody-named-" lead action for somebody else\'s wait, read by name', () => {
    expect(decisionDuplicatesALeadAction(NOBODY_NAMED_DECISIONS[1], NOBODY_NAMED_LEAD_ACTIONS, NOBODY_NAMED_DEPENDENCIES, 'Wanjiru Lead')).toBe(true)
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
