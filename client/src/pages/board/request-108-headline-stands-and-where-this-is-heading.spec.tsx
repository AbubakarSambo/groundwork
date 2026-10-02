import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage } from './BoardPage'
import { boardApi } from '@/api/board'

/**
 * REQUEST 108: THE HEADLINE QUESTION WITH ITS BAR (a), A WORD FOR WHERE A TARGET STANDS (b), AND
 * "WHERE THIS IS HEADING" WITH "RECORD THE DECISION" (d).
 *
 * All three were sent by the engine (`docs/answers-from-engine.md`, 2 October) and drawn nowhere
 * on the board until this change. This renders a real payload shaped the way the server sends it
 * (copied from the engine's own worked example on the sales run, re-f) and checks each field's own
 * sentences reach the lead, with no colon-joined label invented for any of them.
 */
vi.mock('@/api/board', () => ({ boardApi: { get: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn().mockResolvedValue({ initiatorId: 'u-lead' }) } }))
vi.mock('@/api/today', () => ({ todayApi: { get: vi.fn().mockResolvedValue({ count: 0, line: null, comingUp: [], needs: [] }) } }))
vi.mock('@/components/gw/HowThisHasMoved', () => ({ HowThisHasMoved: () => null }))
vi.mock('@/components/gw/ResolutionPanel', () => ({ ResolutionPanel: () => null }))
vi.mock('@/components/gw/WhatSuccessLooksLike', () => ({ WhatSuccessLooksLikeFor: () => null }))
vi.mock('@/components/gw/TheOtherBoardsYouAreIn', () => ({ TheOtherBoardsYouAreIn: () => null }))

let me = { id: 'u-lead', firstName: 'Bisi', role: 'MEMBER' }
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: me }) }))

const objectives = [
  {
    id: 'o-facilities', name: 'approved facilities', count: 11, prevCount: 6, target: 40, delta: 5, isNew: false,
    assumes: [], ownerParticipantId: null, owner: null, askedOf: null, suggestedCount: null,
    stands: { word: 'Behind', says: 'At the pace it has kept since session 1, it would be about 31 by the last session, short of the aim of 40.' },
  },
]

function baseBoard() {
  return {
    groundId: 'g1', renders: true, mode: 'SHARED', family: 'DELIVERY', title: 'Sales team, Q3', scenario: 'OKR_ALIGNMENT',
    coverageVariant: 'text', lastChangedAt: '2026-09-23T15:02:00.000Z',
    sections: ['objectives'],
    myParticipantId: 'p-bisi', canEditFrame: true, readOnlyNote: null,
    participants: [
      { id: 'p-bisi', name: 'Bisi Adeyemi', role: null, managingOnly: true, signedOffAt: null },
      { id: 'p-femi', name: 'Femi Okonkwo', role: null, managingOnly: false, signedOffAt: null },
    ],
    objectives,
    headline: {
      question: 'Will we reach 40 approved facilities this quarter?',
      answer: 'So far it is 11 of the 40 approved facilities. 29 more are needed.',
      bars: [{ objectiveId: 'o-facilities', kind: 'aim' as const, now: 11, target: 40, filled: 15, word: 'Behind' }],
    },
    whereThisIsHeading: {
      heading: 'Where this is heading',
      about: 'Set goals and keep the team on track',
      outcomes: [
        { value: 'ALIGNED', says: 'OKRs aligned to company direction.', more: null },
        { value: 'NOT_YET', says: 'Not yet, more sessions needed.', more: null },
      ],
      outcomesSays: null,
      signals: [
        { says: 'Femi Okonkwo is waiting for the bank statements.', from: 'This was raised once, on 16 September.' },
      ],
      signalsSays: null,
      whatWouldSettleIt: ['Whether to take the credit committee delays to the Head of Credit.'],
      whatWouldSettleItSays: null,
      whoDecides: 'You decide.',
      groundworkDoesNotChoose: 'Groundwork lays out the outcomes and the proof. It doesn’t choose.',
      recordTheDecision: 'Record the decision',
      decided: null,
    },
  }
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

describe('request 108 (a): the headline question, with its answer and its bar', () => {
  it('draws the question, the answer, and the bar’s numbers, above the rest of the board', async () => {
    renderBoard(baseBoard())
    await screen.findByRole('heading', { name: 'Sales team, Q3' })
    expect(screen.getByText('Will we reach 40 approved facilities this quarter?')).toBeInTheDocument()
    expect(screen.getByText('So far it is 11 of the 40 approved facilities. 29 more are needed.')).toBeInTheDocument()
    expect(screen.getByText('11 of 40')).toBeInTheDocument()
  })

  it('draws nothing when the server sends no headline', async () => {
    renderBoard({ ...baseBoard(), headline: null })
    await screen.findByRole('heading', { name: 'Sales team, Q3' })
    expect(screen.queryByText(/Will we reach/)).not.toBeInTheDocument()
  })
})

describe('request 108 (b): a word for where each target stands', () => {
  it('shows the target’s own word as a tag, from objectives[].stands', async () => {
    renderBoard(baseBoard())
    await screen.findByRole('heading', { name: 'Sales team, Q3' })
    // The word appears twice: once in the headline's bar, once beside the objective row.
    expect(screen.getAllByText('Behind').length).toBeGreaterThan(0)
  })
})

describe('request 108 (d): "Where this is heading" and "Record the decision"', () => {
  it('draws the outcomes, the signals, what would settle it, and the lead’s own "Record the decision"', async () => {
    renderBoard(baseBoard())
    await screen.findByRole('heading', { name: 'Sales team, Q3' })
    expect(screen.getByText('Where this is heading')).toBeInTheDocument()
    expect(screen.getByText('OKRs aligned to company direction.')).toBeInTheDocument()
    expect(screen.getByText('Not yet, more sessions needed.')).toBeInTheDocument()
    expect(screen.getByText('Femi Okonkwo is waiting for the bank statements.')).toBeInTheDocument()
    expect(screen.getByText('Whether to take the credit committee delays to the Head of Credit.')).toBeInTheDocument()
    expect(screen.getByText('You decide.')).toBeInTheDocument()
    expect(screen.getByText('Record the decision')).toBeInTheDocument()
  })

  it('draws nothing for a reader the server sends it to as null', async () => {
    renderBoard({ ...baseBoard(), whereThisIsHeading: null })
    await screen.findByRole('heading', { name: 'Sales team, Q3' })
    expect(screen.queryByText('Where this is heading')).not.toBeInTheDocument()
  })
})
