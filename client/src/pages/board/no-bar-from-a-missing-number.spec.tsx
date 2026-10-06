import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage } from './BoardPage'
import { boardApi } from '@/api/board'

/**
 * REQUEST 111 (a): A SCORE OF WHERE A PERSON'S WORK LANDS STAYS REMOVED.
 *
 * The bar variant of "Where work is landing" drew its width from `coverage.reads[].pct`, a field
 * the engine no longer always sends (request 111 (a): no score shown on a person). Reading `pct` as
 * `undefined` drew `width: undefined%`, a zero-width sliver that still read as a verdict with
 * nothing behind it. A row with no `pct` now draws exactly as the text-only variant does: the name,
 * the tag, "What people said" and "Which of these this is" - just no bar.
 */
vi.mock('@/stores/auth', () => ({
  useAuthStore: (sel: any) => sel({ user: { id: 'u-lead', firstName: 'Wairimu', role: 'MEMBER' } }),
}))
vi.mock('@/api/board', () => ({ boardApi: { get: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn().mockResolvedValue({ initiatorId: 'u-lead' }) } }))
vi.mock('@/api/today', () => ({ todayApi: { get: vi.fn().mockResolvedValue({ count: 0, line: null, comingUp: [], needs: [] }) } }))
vi.mock('@/components/gw/HowThisHasMoved', () => ({ HowThisHasMoved: () => null }))
vi.mock('@/components/gw/ResolutionPanel', () => ({ ResolutionPanel: () => null }))
vi.mock('@/components/gw/WhatSuccessLooksLike', () => ({ WhatSuccessLooksLikeFor: () => null }))
vi.mock('@/components/gw/TheOtherBoardsYouAreIn', () => ({ TheOtherBoardsYouAreIn: () => null }))

const board = (pct: number | undefined) => ({
  groundId: 'g1', renders: true, mode: 'SHARED', family: 'DELIVERY', title: 'Sales team, Q3', scenario: 'OKR_ALIGNMENT',
  coverageVariant: 'bar', lastChangedAt: '2026-09-23T15:02:00.000Z',
  sections: ['coverage'],
  myParticipantId: 'p-lead', canEditFrame: false, readOnlyNote: null,
  participants: [
    { id: 'p-lead', name: 'Wairimu Kamau', role: null, managingOnly: true, signedOffAt: null },
    { id: 'p-rukia', name: 'Rukia Otieno', role: null, managingOnly: false, signedOffAt: null },
  ],
  coverage: {
    scope: 'team',
    reads: [{
      participantId: 'p-rukia', name: 'Rukia Otieno', scope: 'team', pct, kind: 'STABLE', trend: 'flat',
      what: 'Rukia said she closed the Nyali Fresh account this week.',
      reason: '', reasonText: 'Nothing has shifted this week.', ownVoice: null, coupledToBlocker: false, remitDefined: true, shown: true,
    }],
  },
})

function renderBoard() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds/g1/board']}>
        <Routes><Route path="/grounds/:id/board" element={<BoardPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('the coverage bar draws no bar from a missing number', () => {
  it('draws a bar when pct is a real number', async () => {
    ;(boardApi.get as any).mockResolvedValue(board(40))
    const { container } = renderBoard()
    await screen.findByText('Rukia Otieno')
    expect(container.querySelector('[style*="width: 40%"]')).toBeTruthy()
  })

  it('draws the row with no bar, and no "width: undefined", when pct is not sent', async () => {
    ;(boardApi.get as any).mockResolvedValue(board(undefined))
    const { container } = renderBoard()
    await screen.findByText('Rukia Otieno')
    expect(screen.getByText('Nothing has shifted this week.')).toBeTruthy()
    expect(container.querySelector('[style*="width: undefined"]')).toBeNull()
    expect(container.querySelector('[style*="width:"]')).toBeNull()
  })
})
