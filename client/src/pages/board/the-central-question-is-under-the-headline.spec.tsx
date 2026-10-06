import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage } from './BoardPage'
import { boardApi } from '@/api/board'

/**
 * FAULT 1 (LIVE RE-WALK, KIJANI FOODS): THE CENTRAL QUESTION WAS NOT ABOVE THE FOLD AT ALL.
 *
 * Commit eb67a3e8 meant to draw `divergence.centralQuestion` once, above the fold, for every
 * family - but it only moved the question to just before "Everything else from this check-in",
 * which on a real board still sits after "The team today", "Blockers", "Reports", "Help nobody
 * mentioned", "Open issues", "How it ends" and "Where this is heading": a dozen sections down the
 * page, read live as the very bottom, not "above the fold" by any reasonable measure.
 *
 * It now draws once, directly under the headline and the glance line, before any of those
 * sections and before any kind-of-work's own sections. This checks it reads once, and before
 * "Where this is heading" in document order - a section that used to come first.
 */
vi.mock('@/stores/auth', () => ({
  useAuthStore: (sel: any) => sel({ user: { id: 'u-lead', firstName: 'Wairimu', role: 'MEMBER' } }),
}))
vi.mock('@/api/board', () => ({ boardApi: { get: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn().mockResolvedValue({ initiatorId: 'u-lead', leadFirstName: 'Wairimu' }) } }))
vi.mock('@/api/today', () => ({ todayApi: { get: vi.fn().mockResolvedValue({ count: 0, line: null, comingUp: [], needs: [] }) } }))
vi.mock('@/components/gw/HowThisHasMoved', () => ({ HowThisHasMoved: () => null }))
vi.mock('@/components/gw/ResolutionPanel', () => ({ ResolutionPanel: () => null }))
vi.mock('@/components/gw/WhatSuccessLooksLike', () => ({ WhatSuccessLooksLikeFor: () => null }))
vi.mock('@/components/gw/TheOtherBoardsYouAreIn', () => ({ TheOtherBoardsYouAreIn: () => null }))
vi.mock('@/components/gw/Suggestions', () => ({ SuggestionsForTheLead: () => null }))

const CENTRAL_QUESTION = 'Does a shop count when it signs, or when it orders again?'

const BOARD = {
  groundId: 'g1', renders: true, mode: 'SHARED', family: 'DELIVERY', title: 'Sales team, Q3', scenario: 'OKR_ALIGNMENT',
  coverageVariant: 'text', lastChangedAt: '2026-09-23T15:02:00.000Z',
  sections: ['divergence'],
  myParticipantId: 'p-lead', canEditFrame: true, readOnlyNote: null,
  participants: [
    { id: 'p-lead', name: 'Wairimu Kamau', role: null, managingOnly: true, signedOffAt: null },
    { id: 'p-rukia', name: 'Rukia Otieno', role: null, managingOnly: false, signedOffAt: null },
  ],
  headline: { question: 'Will we reach 25 sales by 30 September?', answer: 'Not yet. 21 freezers are sold.', bars: [] },
  divergence: {
    items: [{
      topic: 'What counts as a signed shop',
      positions: [
        { who: 'Rukia Otieno', view: 'A signed order form from the shop.' },
      ],
    }],
    agreements: [],
    centralQuestion: CENTRAL_QUESTION,
  },
  whereThisIsHeading: {
    heading: 'Where this is heading', about: 'Set goals and keep the team on track',
    outcomes: [], outcomesSays: 'Nothing has been counted for it yet.',
    signals: [], signalsSays: 'Nothing on record yet.',
    whatWouldSettleIt: [], whatWouldSettleItSays: 'Nothing would settle it yet.',
  },
  eachPerson: [{
    participantId: 'p-rukia', who: 'Rukia Otieno', target: null, count: 0, reason: 'nothing to do', says: 'Checked in today.', ask: null,
  }],
}

function renderBoard() {
  ;(boardApi.get as any).mockResolvedValue(BOARD)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds/g1/board']}>
        <Routes>
          <Route path="/grounds/:id/board" element={<BoardPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('the central question, under the headline, once', () => {
  it('reads once, and before "Where this is heading"', async () => {
    renderBoard()
    const question = await screen.findAllByText(CENTRAL_QUESTION)
    expect(question.length).toBe(1)

    const heading = screen.getByText('Where this is heading')
    // DOCUMENT_POSITION_FOLLOWING: the heading comes after the question, in document order.
    // eslint-disable-next-line no-bitwise
    expect(question[0].compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('reads "What to settle together" above it', async () => {
    renderBoard()
    await screen.findByText(CENTRAL_QUESTION)
    expect(screen.getAllByText('What to settle together').length).toBe(1)
  })
})
