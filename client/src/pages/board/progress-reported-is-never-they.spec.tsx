import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage } from './BoardPage'
import { boardApi } from '@/api/board'

/**
 * BOARD REVIEW, 1 OCTOBER, ITEM 5: "THIS IS PROGRESS THEY REPORTED." NEVER SAYS "THEY".
 *
 * Under "Who owns what", a PROGRESS record used the same fixed sentence - "This is progress they
 * reported." - whether it was the reader's own words or somebody else's, even directly under a
 * card headed with the reader's own name. It now reads "This is progress you reported." for the
 * reader's own card, and "This is progress {name} reported." by name for anybody else's.
 */
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: { id: 'u-lead', firstName: 'Wairimu', role: 'MEMBER' } }) }))
vi.mock('@/api/board', () => ({ boardApi: { get: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn().mockResolvedValue({ initiatorId: 'u-lead' }) } }))
vi.mock('@/api/today', () => ({ todayApi: { get: vi.fn().mockResolvedValue({ count: 0, line: null, comingUp: [], needs: [] }) } }))
vi.mock('@/components/gw/HowThisHasMoved', () => ({ HowThisHasMoved: () => null }))
vi.mock('@/components/gw/ResolutionPanel', () => ({ ResolutionPanel: () => null }))
vi.mock('@/components/gw/WhatSuccessLooksLike', () => ({ WhatSuccessLooksLikeFor: () => null }))
vi.mock('@/components/gw/TheOtherBoardsYouAreIn', () => ({ TheOtherBoardsYouAreIn: () => null }))

const BOARD = {
  groundId: 'g1', renders: true, mode: 'SHARED', family: 'DELIVERY', title: 'Sales team, Q3', scenario: 'OKR_ALIGNMENT',
  coverageVariant: 'text', lastChangedAt: '2026-09-23T15:02:00.000Z',
  sections: ['whoOwnsWhat'],
  myParticipantId: 'p-lead', canEditFrame: true, readOnlyNote: null,
  participants: [
    { id: 'p-lead', name: 'Wairimu Kamau', role: null, managingOnly: true, signedOffAt: null },
    { id: 'p-rukia', name: 'Rukia Otieno', role: null, managingOnly: false, signedOffAt: null },
  ],
  whoOwnsWhat: [
    { participantId: 'p-lead', name: 'Wairimu Kamau', role: null, items: [{ id: 'i1', type: 'PROGRESS', text: 'Signed two more shops.', sessionNumber: 3 }] },
    { participantId: 'p-rukia', name: 'Rukia Otieno', role: null, items: [{ id: 'i2', type: 'PROGRESS', text: 'Closed the Nakuru order.', sessionNumber: 3 }] },
  ],
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

describe('a PROGRESS record under "Who owns what"', () => {
  it('says "you" for the reader\'s own card, and the name for anybody else\'s', async () => {
    renderBoard()
    expect(await screen.findByText('This is progress you reported.')).toBeInTheDocument()
    expect(screen.getByText('This is progress Rukia Otieno reported.')).toBeInTheDocument()
    expect(screen.queryByText(/This is progress they reported/)).not.toBeInTheDocument()
  })
})
