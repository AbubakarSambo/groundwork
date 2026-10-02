import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage } from './BoardPage'
import { boardApi } from '@/api/board'

/**
 * BOARD REVIEW, SALES PIECE C, ITEM 10 (small fixes): two of them check the lead's own rendered
 * board.
 *
 * - "Where people differ": a position with no `view` used to draw the person's bare name with
 *   nothing under it. Checked here by giving one side of a divergence a name and no view.
 * - "The team today" ends with the prototype's own footnote (board-as-lead.txt), but only the
 *   short half - "These are about the work." - since no row here opens to a person's own page yet.
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

const BOARD = {
  groundId: 'g1', renders: true, mode: 'SHARED', family: 'DELIVERY', title: 'Sales team, Q3', scenario: 'OKR_ALIGNMENT',
  coverageVariant: 'text', lastChangedAt: '2026-09-23T15:02:00.000Z',
  sections: ['divergence'],
  myParticipantId: 'p-lead', canEditFrame: true, readOnlyNote: null,
  participants: [
    { id: 'p-lead', name: 'Wairimu Kamau', role: null, managingOnly: true, signedOffAt: null },
    { id: 'p-rukia', name: 'Rukia Otieno', role: null, managingOnly: false, signedOffAt: null },
    { id: 'p-amani', name: 'Amani Wekesa', role: null, managingOnly: false, signedOffAt: null },
  ],
  divergence: {
    items: [{
      topic: 'What counts as a signed shop',
      positions: [
        { who: 'Rukia Otieno', view: null },
        { who: 'Amani Wekesa', view: 'A signed order form from the shop.' },
      ],
      atStake: 'If this is not resolved, the team will track progress using different measures.',
    }],
    agreements: [],
    centralQuestion: null,
  },
  eachPerson: [{
    participantId: 'p-rukia', who: 'Rukia Otieno', target: null, count: 0, reason: 'nothing to do', says: 'Checked in today.', ask: null,
  }],
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

describe('sales piece C, item 10: small fixes', () => {
  it('leaves out a person’s name in "Where people differ" when their view is empty', async () => {
    renderBoard()
    await screen.findByRole('heading', { name: 'Sales team, Q3' })
    const section = screen.getByText('Where people differ').closest('section') as HTMLElement
    expect(within(section).getByText('Amani Wekesa')).toBeTruthy()
    expect(within(section).getByText('A signed order form from the shop.')).toBeTruthy()
    expect(within(section).queryByText('Rukia Otieno')).toBeNull()
  })

  it('ends "The team today" with the short footnote, since no row opens to a person’s page', async () => {
    renderBoard()
    await screen.findByRole('heading', { name: 'Sales team, Q3' })
    const section = screen.getByText('The team today').closest('section') as HTMLElement
    expect(within(section).getByText('These are about the work.')).toBeTruthy()
    expect(within(section).queryByText(/Open anyone to see/)).toBeNull()
  })
})
