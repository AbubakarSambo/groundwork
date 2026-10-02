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

/*
 * SECOND BOARD REVIEW, ITEM 9, PRIVACY: `contribution[].basis` and `coverage.reads[].basis` carry
 * how much and how checkable the record behind a read is - "Based on 1 check-in, 0 checkable
 * things named, none of it confirmed by anyone else.", "Nothing Faraji Odhiambo has said so far is
 * checkable..." - exactly what CLAUDE.md's "Leads never see how a person's answers were rated."
 * forbids. This section is lead-only already; this fixture adds `basis` to both rows and checks
 * the lead's own render never shows either sentence, while the rest of each card still does.
 */
const BOARD_WITH_BASIS = {
  ...BOARD,
  contribution: [{ ...BOARD.contribution[0], basis: 'Based on 1 check-in, 0 checkable things named, none of it confirmed by anyone else.' }],
  coverage: {
    ...BOARD.coverage,
    reads: [{ ...BOARD.coverage.reads[0], basis: 'Based on 2 check-ins, 0 checkable things named, none of it confirmed by anyone else.' }],
  },
}

/*
 * THIRD BOARD REVIEW, ITEM 1, PRIVACY: `contribution[].reason` itself can BE the sentence about
 * how checkable a person's answers are, when `nothingCheckable` is true - "Nothing Faraji
 * Odhiambo has said so far is checkable, because nobody else can check it yet. A number, a date
 * or a document for what moved would change that." CLAUDE.md's "Leads never see how a person's
 * answers were rated" forbids this exactly as much as `basis` above. This fixture carries the
 * real sentence seen on the sales board's third review, and the lead's own render must never show
 * it, while the rest of the card (the name, the tag, their own words) still draws.
 */
const BOARD_WITH_NOTHING_CHECKABLE = {
  ...BOARD,
  contribution: [{
    ...BOARD.contribution[0],
    name: 'Faraji Odhiambo', participantId: 'p-faraji',
    reason: 'Nothing Faraji Odhiambo has said so far is checkable, because nobody else can check it yet. A number, a date or a document for what moved would change that.',
    nothingCheckable: true,
  }],
}

function renderBoard(board: any = BOARD) {
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
    await screen.findByRole('heading', { name: 'Sales team, Q3' })
    expect(screen.queryByText('She has closed three of her four accounts this quarter.')).toBeNull()
    expect(screen.queryByText('Rukia said she closed the Nyali Fresh account this week.')).toBeNull()
    expect(screen.queryByText('Contribution against role')).toBeNull()
    expect(screen.queryByText('Where work is landing')).toBeNull()
  })

  it('never draws how checkable a person’s answers are, for the lead', async () => {
    me = { id: 'u-lead', firstName: 'Wairimu', role: 'MEMBER' }
    renderBoard(BOARD_WITH_BASIS)
    expect(await screen.findByText('She has closed three of her four accounts this quarter.')).toBeTruthy()
    expect(screen.getByText('Rukia said she closed the Nyali Fresh account this week.')).toBeTruthy()
    expect(screen.queryByText(/Based on 1 check-in, 0 checkable things named/)).toBeNull()
    expect(screen.queryByText(/Based on 2 check-ins, 0 checkable things named/)).toBeNull()
  })

  it('never draws how checkable a person’s answers are when the reason itself says so, for the lead', async () => {
    me = { id: 'u-lead', firstName: 'Wairimu', role: 'MEMBER' }
    renderBoard(BOARD_WITH_NOTHING_CHECKABLE)
    await screen.findByText('Faraji Odhiambo')
    expect(screen.queryByText(/Nothing Faraji Odhiambo has said so far is checkable/)).toBeNull()
  })
})
