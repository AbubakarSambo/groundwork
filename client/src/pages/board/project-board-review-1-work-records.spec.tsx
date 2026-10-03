import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage } from './BoardPage'
import { boardApi } from '@/api/board'

/**
 * PROJECT BOARD REVIEW 1, FIX 3.
 *
 * Fixture shape copied from the review's own capture: the DRIFT board ("The partnerships work has
 * gone quiet", dac969d3) sends all six `workRecords` sections as "not-known", with the same `why`.
 */
let me = { id: 'p-lead', firstName: 'Zuri', role: 'MEMBER' }
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: me }) }))
vi.mock('@/api/board', () => ({ boardApi: { get: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn().mockResolvedValue({ initiatorId: 'p-lead', leadFirstName: 'Wanjiru' }) } }))
vi.mock('@/api/today', () => ({ todayApi: { get: vi.fn().mockResolvedValue({ count: 0, line: null, comingUp: [], needs: [] }) } }))
vi.mock('@/components/gw/HowThisHasMoved', () => ({ HowThisHasMoved: () => null }))
vi.mock('@/components/gw/ResolutionPanel', () => ({ ResolutionPanel: () => null }))
vi.mock('@/components/gw/WhatSuccessLooksLike', () => ({ WhatSuccessLooksLikeFor: () => null }))
vi.mock('@/components/gw/TheOtherBoardsYouAreIn', () => ({ TheOtherBoardsYouAreIn: () => null }))
vi.mock('@/components/gw/Suggestions', () => ({ SuggestionsForTheLead: () => null }))

const NOT_KNOWN_WHY = 'Groundwork does not know what kind of work this check-in is about yet, so it keeps no records of this kind.'

const DRIFT_BOARD = {
  groundId: 'g1', renders: true, mode: 'SHARED', family: 'SENSING', title: 'The partnerships work has gone quiet', scenario: 'DRIFT',
  coverageVariant: 'text', lastChangedAt: '2026-09-23T15:02:00.000Z',
  sections: [],
  myParticipantId: 'p-lead', canEditFrame: true, readOnlyNote: null,
  kindOfWork: null,
  participants: [{ id: 'p-lead', name: 'Zuri Hassan', role: null, managingOnly: true, signedOffAt: null }],
  headline: null,
  workRecords: [
    { section: 'Deal grid', holds: '', state: 'not-known' as const, why: NOT_KNOWN_WHY },
    { section: 'Forecast', holds: '', state: 'not-known' as const, why: NOT_KNOWN_WHY },
    { section: 'Themes', holds: '', state: 'not-known' as const, why: NOT_KNOWN_WHY },
    { section: 'Work plan', holds: '', state: 'not-known' as const, why: NOT_KNOWN_WHY },
    { section: 'Timeline', holds: '', state: 'not-known' as const, why: NOT_KNOWN_WHY },
    { section: 'Obligations', holds: '', state: 'not-known' as const, why: NOT_KNOWN_WHY },
  ],
}

function renderBoard(board: any) {
  ;(boardApi.get as any).mockResolvedValue(board)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds/g1/board']}>
        <Routes><Route path="/grounds/:id/board" element={<BoardPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('fix 3: every workRecords section not-known, same why', () => {
  it('says it once, with no "Deal grid" / "Forecast" / "Themes" / "Work plan" heading', async () => {
    me = { id: 'p-lead', firstName: 'Zuri', role: 'MEMBER' }
    renderBoard(DRIFT_BOARD)
    await screen.findByRole('heading', { name: 'The partnerships work has gone quiet' })
    expect(screen.getAllByText(NOT_KNOWN_WHY).length).toBe(1)
    expect(screen.queryByText('Deal grid')).toBeNull()
    expect(screen.queryByText('Forecast')).toBeNull()
    expect(screen.queryByText('Themes')).toBeNull()
    expect(screen.queryByText('Work plan')).toBeNull()
  })
})
