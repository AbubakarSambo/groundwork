import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage } from './BoardPage'
import { boardApi } from '@/api/board'
import { groundsApi } from '@/api/grounds'

/**
 * FAULT 8 (LIVE RE-WALK): "START MY CHECK-IN" ONCE AMINA HAS ALREADY FINISHED, WITH HER NEXT
 * SESSION NOT YET OPEN.
 *
 * `noSessionOpenForReaderFallback` (BoardPage.tsx, beside `noSessionOpenForReader`) used to run
 * only when `!b.phaseSpine` - meant as a fallback for a kind of work that never sends one at all.
 * But a phase spine's own round stays "current" team-wide until EVERYBODY finishes it, so Amina,
 * who has already finished her own part early, can read a board whose phase spine still calls the
 * round current while her own next check-in (served on `GET /grounds/:id`) is `NOT_STARTED`, its
 * `availableFrom` still in the future - nothing of hers is actually open. The old gate never asked
 * her own question on a board that does send a spine, so the button stayed up regardless.
 */
vi.mock('@/stores/auth', () => ({
  useAuthStore: (sel: any) => sel({ user: { id: 'u-amina', firstName: 'Amina', role: 'MEMBER' } }),
}))
vi.mock('@/api/board', () => ({ boardApi: { get: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn() } }))
vi.mock('@/api/today', () => ({ todayApi: { get: vi.fn().mockResolvedValue({ count: 0, line: null, comingUp: [], needs: [] }) } }))
vi.mock('@/components/gw/HowThisHasMoved', () => ({ HowThisHasMoved: () => null }))
vi.mock('@/components/gw/ResolutionPanel', () => ({ ResolutionPanel: () => null }))
vi.mock('@/components/gw/WhatSuccessLooksLike', () => ({ WhatSuccessLooksLikeFor: () => null }))
vi.mock('@/components/gw/TheOtherBoardsYouAreIn', () => ({ TheOtherBoardsYouAreIn: () => null }))

const BOARD = {
  groundId: 'g1', renders: true, mode: 'SHARED', family: 'DELIVERY', sections: ['objectives'],
  title: 'Sales team, Q3', scenario: 'OKR_ALIGNMENT', coverageVariant: 'text',
  lastChangedAt: '2026-09-23T15:02:00.000Z',
  participants: [
    { id: 'p-lead', name: 'Wairimu Kamau', role: null, managingOnly: true, signedOffAt: null },
    { id: 'p-amina', name: 'Amina Hassan', role: null, managingOnly: false, signedOffAt: null },
  ],
  myParticipantId: 'p-amina', canEditFrame: false, readOnlyNote: null,
  objectives: [],
  /* The team's round is still "current" - others have not all finished session 1 yet. */
  phaseSpine: {
    startsAt: null, endsAt: null, currentSession: 1, plannedSessions: 6,
    sessions: [{ n: 1, state: 'current', date: null, opensOn: null, says: null }],
  },
}

function renderBoard() {
  ;(boardApi.get as any).mockResolvedValue(BOARD)
  ;(groundsApi.get as any).mockResolvedValue({
    initiatorId: 'u-wairimu',
    participants: [{ id: 'p-amina', userId: 'u-amina' }],
    /* Amina's own session 2 exists, NOT_STARTED, and does not open until 12 October - nothing of
       hers is open right now, whatever the team's round says. */
    checkIns: [
      { participantId: 'p-amina', status: 'COMPLETED', sessionNumber: 1 },
      { participantId: 'p-amina', status: 'NOT_STARTED', sessionNumber: 2, availableFrom: '2026-10-12T00:00:00.000Z' },
    ],
  })
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds/g1/board']}>
        <Routes><Route path="/grounds/:id/board" element={<BoardPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => vi.clearAllMocks())

describe('Amina, finished early, is not told to start a session that has not opened', () => {
  it('does not read "Start my check-in" while her own next session is not yet open', async () => {
    renderBoard()
    await screen.findByRole('tab', { name: 'Check-in' })
    expect(screen.queryByText('Start my check-in')).toBeNull()
  })
})
