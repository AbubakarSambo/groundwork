import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage } from './BoardPage'
import { boardApi } from '@/api/board'

/**
 * PROJECT BOARD REVIEW 1, FIX 7: "WAITING ON: THE PIPELINE" IS ONE SENTENCE, AND THE "THEN" QUOTE
 * IS THE ENGINE'S OWN `blockers[].holdingUp`, NOT A CLIENT-BUILT QUOTE FROM `dependencies[].then`.
 *
 * Fixture copied from the review's own capture (the engineering release, 555ac67d): the
 * dependency "a fix for the pipeline" (id 1c288046-...) and the matching blocker of the same id
 * carry the engine's own full sentence in `holdingUp`.
 */
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: { id: 'p-lead', firstName: 'Wanjiru', role: 'MEMBER' } }) }))
vi.mock('@/api/board', () => ({ boardApi: { get: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn().mockResolvedValue({ initiatorId: 'p-lead', leadFirstName: 'Wanjiru' }) } }))
vi.mock('@/api/today', () => ({ todayApi: { get: vi.fn().mockResolvedValue({ count: 0, line: null, comingUp: [], needs: [] }) } }))
vi.mock('@/components/gw/HowThisHasMoved', () => ({ HowThisHasMoved: () => null }))
vi.mock('@/components/gw/ResolutionPanel', () => ({ ResolutionPanel: () => null }))
vi.mock('@/components/gw/WhatSuccessLooksLike', () => ({ WhatSuccessLooksLikeFor: () => null }))
vi.mock('@/components/gw/TheOtherBoardsYouAreIn', () => ({ TheOtherBoardsYouAreIn: () => null }))
vi.mock('@/components/gw/Suggestions', () => ({ SuggestionsForTheLead: () => null }))

const BOARD = {
  groundId: 'g1', renders: true, mode: 'SHARED', family: 'DELIVERY', title: 'Engineering release, test', scenario: 'NEW_PROJECT',
  coverageVariant: 'text', lastChangedAt: '2026-09-29T18:02:00.000Z',
  sections: ['dependencies'],
  myParticipantId: 'p-lead', canEditFrame: true, readOnlyNote: null,
  participants: [
    { id: 'p-lead', name: 'Wanjiru Lead', role: null, managingOnly: true, signedOffAt: null },
    { id: 'p-aisha', name: 'Aisha Wanjiku', role: null, managingOnly: false, signedOffAt: null },
  ],
  dependencies: [
    {
      id: '1c288046-9957-4b20-b09f-2c44bea1e8b4', from: 'Aisha Wanjiku', fromParticipantId: 'p-aisha',
      what: 'a fix for the pipeline', on: 'the pipeline', onParticipantId: null, status: 'BLOCKING' as const,
      then: 'I will deploy the refund endpoint to staging on Thursday 1 October',
    },
  ],
  blockers: [
    {
      id: '1c288046-9957-4b20-b09f-2c44bea1e8b4', who: 'Aisha Wanjiku', name: 'a fix for the pipeline', state: 'blocking' as const,
      says: 'Aisha Wanjiku is waiting on the pipeline for a fix for the pipeline.',
      raised: { times: 1, firstRaisedAt: '2026-09-29', lastRaisedAt: '2026-09-29', says: 'This was raised once, on 29 September.', sessions: [1], inSessions: 'It was raised in check-in 1.' },
      proof: { state: 'none', says: 'Nothing on record proves it yet. It rests on what Aisha Wanjiku said.' },
      timeGiven: 'No time has been given for it.', wouldClearIt: null, wouldClearItSays: 'Nobody has said what would clear it yet.',
      holdingUp: 'Aisha Wanjiku said that once it is cleared, "I will deploy the refund endpoint to staging on Thursday 1 October."',
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

describe('"Waiting on" is one sentence, and draws blockers[].holdingUp', () => {
  it('reads "This is waiting on the pipeline." and the engine\'s own holdingUp sentence', async () => {
    renderBoard()
    await screen.findByRole('heading', { name: 'Engineering release, test' })
    const section = screen.getByRole('heading', { name: 'Waiting on' }).closest('section') as HTMLElement
    expect(within(section).getByText(/This is waiting on/)).toBeTruthy()
    expect(within(section).getAllByText('the pipeline').length).toBeGreaterThan(0)
    expect(within(section).queryByText(/Waiting on:/)).toBeNull()
    expect(within(section).getByText('Aisha Wanjiku said that once it is cleared, "I will deploy the refund endpoint to staging on Thursday 1 October."')).toBeTruthy()
    expect(within(section).queryByText(/When this arrives/)).toBeNull()
  })
})
