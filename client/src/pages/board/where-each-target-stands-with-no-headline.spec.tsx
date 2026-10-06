import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage } from './BoardPage'
import { boardApi } from '@/api/board'

/**
 * PROJECT BOARD REVIEW 1, FIX 2: A PROJECT BOARD WITH NO HEADLINE STILL SHOWS "WHERE EACH TARGET
 * STANDS" AT THE TOP. The DRIFT fixture ("The partnerships work has gone quiet", dac969d3) sends
 * `headline: null` and an objective with `journey.say: "Nothing has been counted for it yet."` -
 * copied from the review's own capture. This used to show nowhere except the end fold.
 */
vi.mock('@/stores/auth', () => ({
  useAuthStore: (sel: any) => sel({ user: { id: 'p-lead', firstName: 'Zuri', role: 'MEMBER' } }),
}))
vi.mock('@/api/board', () => ({ boardApi: { get: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn().mockResolvedValue({ initiatorId: 'p-lead', leadFirstName: 'Zuri' }) } }))
vi.mock('@/api/today', () => ({ todayApi: { get: vi.fn().mockResolvedValue({ count: 0, line: null, comingUp: [], needs: [] }) } }))
vi.mock('@/components/gw/HowThisHasMoved', () => ({ HowThisHasMoved: () => null }))
vi.mock('@/components/gw/ResolutionPanel', () => ({ ResolutionPanel: () => null }))
vi.mock('@/components/gw/WhatSuccessLooksLike', () => ({ WhatSuccessLooksLikeFor: () => null }))
vi.mock('@/components/gw/TheOtherBoardsYouAreIn', () => ({ TheOtherBoardsYouAreIn: () => null }))
vi.mock('@/components/gw/Suggestions', () => ({ SuggestionsForTheLead: () => null }))

const BOARD = {
  groundId: 'g1', renders: true, mode: 'SHARED', family: 'SENSING', title: 'The partnerships work has gone quiet', scenario: 'DRIFT',
  coverageVariant: 'text', lastChangedAt: '2026-09-23T15:02:00.000Z',
  sections: ['objectives'],
  myParticipantId: 'p-lead', canEditFrame: true, readOnlyNote: null,
  participants: [
    { id: 'p-lead', name: 'Zuri Hassan', role: null, managingOnly: true, signedOffAt: null },
  ],
  headline: null,
  objectives: [
    {
      id: 'o-reach', name: 'We want to expand our market reach through strategic alliances.', count: 0, prevCount: 0, target: null, delta: 0, isNew: false,
      assumes: [], assumesSays: 'Nothing on record says what this target assumes yet.', ownerParticipantId: null, owner: null, askedOf: null, suggestedCount: null,
      journey: { direction: 'unknown' as const, start: 0, now: 0, target: null, say: 'Nothing has been counted for it yet.', covered: null },
    },
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

describe('"Where each target stands" with no headline', () => {
  it('draws at the top from objectives, not only in the fold', async () => {
    renderBoard()
    await screen.findByRole('heading', { name: 'The partnerships work has gone quiet' })
    const heading = screen.getByText('Where each target stands')
    const panel = heading.closest('.gwui-panel') as HTMLElement
    expect(within(panel).getByText('We want to expand our market reach through strategic alliances.')).toBeTruthy()
    expect(within(panel).getByText('Nothing has been counted for it yet.')).toBeTruthy()
  })
})
