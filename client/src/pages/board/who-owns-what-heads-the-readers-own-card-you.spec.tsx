import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage } from './BoardPage'
import { boardApi } from '@/api/board'

/**
 * SECOND BOARD REVIEW: "WHO OWNS WHAT" HEADS THE READER'S OWN CARD WITH THEIR OWN NAME.
 *
 * Every sentence inside a "Who owns what" card already says "you" for the reader's own record
 * (progress-reported-is-never-they.spec.tsx), but the card's own heading above it still printed
 * the reader's real name - Wairimu reading her own card under "Wairimu Kamau", on the board she
 * herself was reading. The heading now reads "You" for whichever card matches `b.myParticipantId`,
 * and the real name for everybody else's, the same way the design already treats every reader.
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

describe('"Who owns what" heads the reader’s own card "You"', () => {
  it('heads Wairimu’s own card "You", and Rukia’s card by name', async () => {
    renderBoard()
    await screen.findByText('Who owns what')
    expect(screen.getByText('You')).toBeInTheDocument()
    expect(screen.getByText('Rukia Otieno')).toBeInTheDocument()
    expect(screen.queryByText('Wairimu Kamau')).not.toBeInTheDocument()
  })
})
