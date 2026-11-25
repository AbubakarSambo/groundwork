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
    stands: { word: 'Behind', says: 'At the pace it has kept since check-in 1, it would be about 31 by the last check-in, short of the aim of 40.' },
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
        { value: 'NOT_YET', says: 'Not yet, more check-ins needed.', more: null },
      ],
      outcomesSays: null,
      signals: [
        { says: 'Femi Okonkwo is waiting for the bank statements.', from: 'This was raised once, on 16 September.' },
      ],
      signalsSays: null,
      whatWouldSettleIt: ['Whether to take the credit committee delays to the Head of Credit.'],
      whatWouldSettleItSays: null,
      whoDecides: 'You decide.',
      recordTheDecision: 'Record the decision',
      decided: null,
    },
    byArea: { state: 'not-known' as const, why: 'Nothing on record says which site, county, team or queue each piece of work belongs to, so the work cannot be shown by area yet.' },
    reportedAgainstCriteria: {
      state: 'not-known' as const,
      why: 'Nothing on record says what a deal must show to be at each stage, so the board counts what people reported and how much of it has a document behind it, but not how many meet the rules.',
      stages: [
        { stage: 'Quoted', reported: 1, withProof: 0, says: '1 deal was reported at Quoted, and it has no document behind it.' },
        { stage: 'Won', reported: 1, withProof: 0, says: '1 deal was reported at Won, and it has no document behind it.' },
      ],
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
    /* 23 November (journey 3): one drawing of this section for every board (WhereThisIsHeadingBody.tsx), with the prototype's short
       name for each ending ("On course", board-as-lead.txt) and without "not yet", which the prototype's boards never list. */
    expect(screen.getByText('On course')).toBeInTheDocument()
    expect(screen.queryByText('Not yet, more check-ins needed.')).not.toBeInTheDocument()
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

describe('request 107 (c), parts 3 and 4: by area, and reported against criteria', () => {
  /* Changed 23 November (journey 3): on the rebuilt board a part with nothing to group is not drawn at all (design guide, rule 10:
     an empty section is one line and an action, or nothing). It still never invents a grouping. */
  it('draws no "by area" when nothing on record says where the work belongs, rather than inventing a grouping', async () => {
    renderBoard(baseBoard())
    await screen.findByRole('heading', { name: 'Sales team, Q3' })
    expect(screen.queryByText('By area')).not.toBeInTheDocument()
    expect(screen.queryByText(/Nothing on record says which site, county, team or queue/)).not.toBeInTheDocument()
  })

  it('counts what was reported at each stage, never "criteria met"', async () => {
    renderBoard(baseBoard())
    await screen.findByRole('heading', { name: 'Sales team, Q3' })
    expect(screen.getByText('Reported, stage by stage')).toBeInTheDocument()
    expect(screen.getByText('1 deal was reported at Quoted, and it has no document behind it.')).toBeInTheDocument()
    expect(screen.getByText('1 deal was reported at Won, and it has no document behind it.')).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('criteria met')
  })
})
