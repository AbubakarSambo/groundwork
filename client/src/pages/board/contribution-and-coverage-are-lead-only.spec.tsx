import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage } from './BoardPage'
import { boardApi } from '@/api/board'

/**
 * U.10 RE-REVIEW, NEEDS HAFSAH 0f: LEAD ONLY UNTIL SHE ANSWERS.
 *
 * "Contribution against role" and "Where work is landing" are the board's own read on how one
 * person's work is going against their role. No prototype screen shows either to anyone, and 0f
 * (docs/morning-report-ui.md) asks whether a participant should ever read this about a colleague.
 * Until it is answered, these sections draw for whoever runs the check-in only - the same gate
 * `eachPerson` already uses - so this renders the same board payload as the lead and as a
 * participant and checks the participant reads neither section at all.
 */
let me = { id: 'u-lead', firstName: 'Wairimu', role: 'MEMBER' }
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: me }) }))
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
  sections: ['contribution', 'coverage'],
  myParticipantId: 'p-rukia', canEditFrame: false, readOnlyNote: null,
  participants: [
    { id: 'p-lead', name: 'Wairimu Kamau', role: null, managingOnly: true, signedOffAt: null },
    { id: 'p-rukia', name: 'Rukia Otieno', role: null, managingOnly: false, signedOffAt: null },
  ],
  contribution: [{
    participantId: 'p-rukia', name: 'Rukia Otieno', remit: null, remitDefined: true,
    position: null, positionLabel: null, reason: 'She has closed three of her four accounts this quarter.',
    fnLabel: null, fnConfident: true, isBlocked: false, ownVoice: null, shown: true,
  }],
  coverage: {
    scope: 'team',
    reads: [{
      participantId: 'p-rukia', name: 'Rukia Otieno', scope: 'team', pct: 40, kind: 'STABLE', trend: 'flat',
      what: 'Rukia said she closed the Nyali Fresh account this week.',
      reason: '', reasonText: '', ownVoice: null, coupledToBlocker: false, remitDefined: true, shown: true,
    }],
  },
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

describe('contribution and coverage are lead only, pending 0f', () => {
  it('draws for whoever runs the check-in', async () => {
    me = { id: 'u-lead', firstName: 'Wairimu', role: 'MEMBER' }
    renderBoard()
    expect(await screen.findByText('She has closed three of her four accounts this quarter.')).toBeTruthy()
    expect(screen.getByText('Rukia said she closed the Nyali Fresh account this week.')).toBeTruthy()
  })

  it('draws neither for a participant', async () => {
    me = { id: 'u-rukia', firstName: 'Rukia', role: 'MEMBER' }
    renderBoard()
    await screen.findByText('Sales team, Q3')
    expect(screen.queryByText('She has closed three of her four accounts this quarter.')).toBeNull()
    expect(screen.queryByText('Rukia said she closed the Nyali Fresh account this week.')).toBeNull()
    expect(screen.queryByText('Contribution against role')).toBeNull()
    expect(screen.queryByText('Where work is landing')).toBeNull()
  })
})
