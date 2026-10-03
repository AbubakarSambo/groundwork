import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage } from './BoardPage'
import { todayApi } from '@/api/today'
import { boardApi } from '@/api/board'

/** REQUEST 122: Today's items that the board lists itself (`onTheBoardToo`) are not drawn a second time among the board's own needs. */
vi.mock('@/stores/auth', () => ({
  useAuthStore: (sel: any) => sel({ user: { id: 'u-lead', firstName: 'Wairimu', role: 'MEMBER' } }),
}))
vi.mock('@/api/board', () => ({ boardApi: { get: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn().mockResolvedValue({ initiatorId: 'u-lead', leadFirstName: 'Wairimu' }) } }))
vi.mock('@/api/today', () => ({ todayApi: { get: vi.fn() } }))
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


describe('Today items the board already lists', () => {
  it('draws an ordinary item for this check-in once, and leaves out one marked onTheBoardToo', async () => {
    const mk = (key: string, title: string, extra: object = {}) => ({ key, kind: 'decide', title, detail: null, action: { label: 'Open it', to: '/grounds/g1' }, groundId: 'g1', organizationId: 'o1', ...extra })
    ;(todayApi.get as any).mockResolvedValue({ count: 2, line: null, comingUp: [], needs: [mk('a', 'Reply to Baraka about the quote.'), mk('b', 'Decide the discount for Baraka.', { onTheBoardToo: true })] })
    renderBoard()
    expect(await screen.findByText('Reply to Baraka about the quote.')).toBeTruthy()
    expect(screen.queryByText('Decide the discount for Baraka.')).toBeNull()
  })
})
