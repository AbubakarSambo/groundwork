import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage } from './BoardPage'
import { boardApi } from '@/api/board'

/**
 * U.10 RE-REVIEW, HAFSAH'S ADDITION: ON AN EVALUATION CHECK-IN, THE PERSON BEING REVIEWED NEVER
 * READS A COLLEAGUE'S NAME.
 *
 * peers-are-named.ts: in an EVALUATION or COHORT family ground, colleagues stay unnamed to each
 * other by default. The board already applies this server-side (board.service.ts's `named()`), so
 * `positions[].who` for a masked side already arrives as "A colleague" rather than a real name -
 * this renders that shape and checks "Who sees this differently" reads "People see this
 * differently." rather than naming anyone, for a PIP ("Help someone get back on track") read by
 * Daniel, the person it is about.
 */
let me = { id: 'u-daniel', firstName: 'Daniel', role: 'MEMBER' }
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: me }) }))
vi.mock('@/api/board', () => ({ boardApi: { get: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn().mockResolvedValue({ initiatorId: 'u-lead' }) } }))
vi.mock('@/api/today', () => ({ todayApi: { get: vi.fn().mockResolvedValue({ count: 0, line: null, comingUp: [], needs: [] }) } }))
vi.mock('@/components/gw/HowThisHasMoved', () => ({ HowThisHasMoved: () => null }))
vi.mock('@/components/gw/ResolutionPanel', () => ({ ResolutionPanel: () => null }))
vi.mock('@/components/gw/WhatSuccessLooksLike', () => ({ WhatSuccessLooksLikeFor: () => null }))
vi.mock('@/components/gw/TheOtherBoardsYouAreIn', () => ({ TheOtherBoardsYouAreIn: () => null }))

const BOARD = {
  groundId: 'g1', renders: true, mode: 'SHARED', family: 'EVALUATION', title: 'Daniel, first 90 days', scenario: 'PIP',
  coverageVariant: 'text', lastChangedAt: '2026-09-23T15:02:00.000Z',
  sections: ['divergence'],
  myParticipantId: 'p-daniel', canEditFrame: false, readOnlyNote: null,
  participants: [
    { id: 'p-lead', name: 'Wairimu Kamau', role: null, managingOnly: true, signedOffAt: null },
    { id: 'p-daniel', name: 'Daniel Kiptoo', role: null, managingOnly: false, signedOffAt: null },
  ],
  divergence: {
    items: [{
      topic: 'Whether the deadline was clear', text: 'The two accounts disagree.',
      positions: [
        { who: 'Daniel Kiptoo', view: 'He says the deadline was never confirmed.' },
        { who: 'A colleague', view: 'They say it was agreed in the kickoff.' },
      ],
    }],
    agreements: [], centralQuestion: null, pointer: '',
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

describe('an evaluation check-in never names a colleague to the person being reviewed', () => {
  it('reads "People see this differently.", never a name, as Daniel', async () => {
    renderBoard()
    expect(await screen.findByText('Whether the deadline was clear')).toBeTruthy()
    expect(screen.getByText('People see this differently.')).toBeTruthy()
    expect(screen.queryByText(/see this differently\./i, { exact: false })?.textContent).toBe('People see this differently.')
  })
})
