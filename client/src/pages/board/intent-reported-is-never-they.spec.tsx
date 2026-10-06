import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage } from './BoardPage'
import { boardApi } from '@/api/board'

/**
 * PROJECT BOARD REVIEW 1, FIX 5: "THIS IS SOMETHING THEY INTEND TO DO." NEVER SAYS "THEY" EITHER.
 *
 * The same defect as PROGRESS (board review, 1 October, item 5), left in place for INTENT: a fixed
 * sentence said "they" even on the reader's own words. Now reads "This is something you intend to
 * do." for the reader's own card, and "This is something {name} intends to do." otherwise.
 */
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: { id: 'u-lead', firstName: 'Wanjiru', role: 'MEMBER' } }) }))
vi.mock('@/api/board', () => ({ boardApi: { get: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn().mockResolvedValue({ initiatorId: 'u-lead' }) } }))
vi.mock('@/api/today', () => ({ todayApi: { get: vi.fn().mockResolvedValue({ count: 0, line: null, comingUp: [], needs: [] }) } }))
vi.mock('@/components/gw/HowThisHasMoved', () => ({ HowThisHasMoved: () => null }))
vi.mock('@/components/gw/ResolutionPanel', () => ({ ResolutionPanel: () => null }))
vi.mock('@/components/gw/WhatSuccessLooksLike', () => ({ WhatSuccessLooksLikeFor: () => null }))
vi.mock('@/components/gw/TheOtherBoardsYouAreIn', () => ({ TheOtherBoardsYouAreIn: () => null }))

const BOARD = {
  groundId: 'g1', renders: true, mode: 'SHARED', family: 'DELIVERY', title: 'Engineering release, test', scenario: 'NEW_PROJECT',
  coverageVariant: 'text', lastChangedAt: '2026-09-29T18:02:00.000Z',
  sections: ['whoOwnsWhat'],
  myParticipantId: 'p-lead', canEditFrame: true, readOnlyNote: null,
  participants: [
    { id: 'p-lead', name: 'Wanjiru Lead', role: null, managingOnly: true, signedOffAt: null },
    { id: 'p-aisha', name: 'Aisha Wanjiku', role: null, managingOnly: false, signedOffAt: null },
  ],
  whoOwnsWhat: [
    { participantId: 'p-lead', name: 'Wanjiru Lead', role: null, items: [{ id: 'i1', type: 'INTENT', text: 'Ask the platform lead who owns the API format.', sessionNumber: 1 }] },
    { participantId: 'p-aisha', name: 'Aisha Wanjiku', role: null, items: [{ id: 'i2', type: 'INTENT', text: 'Deploy the refund endpoint to staging.', sessionNumber: 1 }] },
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

describe('an INTENT record under "Who owns what"', () => {
  it('says "you" for the reader\'s own card, and the name for anybody else\'s', async () => {
    renderBoard()
    expect(await screen.findByText('This is something you intend to do.')).toBeInTheDocument()
    expect(screen.getByText('This is something Aisha Wanjiku intends to do.')).toBeInTheDocument()
    expect(screen.queryByText(/This is something they intend to do/)).not.toBeInTheDocument()
  })
})
