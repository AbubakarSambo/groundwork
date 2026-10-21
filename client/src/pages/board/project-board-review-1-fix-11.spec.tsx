import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage } from './BoardPage'
import { boardApi } from '@/api/board'

/**
 * PROJECT BOARD REVIEW 1, FIX 11: "OPEN ISSUES" IN THE END FOLD, "WHO CHECKED IN" BEFORE
 * "BLOCKERS", AND "YOUR SHARE" DRAWN FOR ANY KIND OF WORK - ALL FOR A PROJECT BOARD (NEW_PROJECT,
 * DRIFT) ONLY.
 */
let me = { id: 'p-lead', firstName: 'Wanjiru', role: 'MEMBER' }
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: me }) }))
vi.mock('@/api/board', () => ({ boardApi: { get: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn().mockResolvedValue({ initiatorId: 'p-lead', leadFirstName: 'Wanjiru' }) } }))
vi.mock('@/api/today', () => ({ todayApi: { get: vi.fn().mockResolvedValue({ count: 0, line: null, comingUp: [], needs: [] }) } }))
vi.mock('@/components/gw/HowThisHasMoved', () => ({ HowThisHasMoved: () => null }))
vi.mock('@/components/gw/ResolutionPanel', () => ({ ResolutionPanel: () => null }))
vi.mock('@/components/gw/WhatSuccessLooksLike', () => ({ WhatSuccessLooksLikeFor: () => null }))
vi.mock('@/components/gw/TheOtherBoardsYouAreIn', () => ({ TheOtherBoardsYouAreIn: () => null }))
vi.mock('@/components/gw/Suggestions', () => ({ SuggestionsForTheLead: () => null }))

const LEAD_BOARD = {
  groundId: 'g1', renders: true, mode: 'SHARED', family: 'DELIVERY', title: 'Engineering release, test', scenario: 'NEW_PROJECT',
  coverageVariant: 'text', lastChangedAt: '2026-09-29T18:02:00.000Z',
  sections: ['checkInGrid', 'blockers'],
  myParticipantId: 'p-lead', canEditFrame: true, readOnlyNote: null,
  kindOfWork: 'engineering release' as const,
  participants: [
    { id: 'p-lead', name: 'Wanjiru Lead', role: null, managingOnly: true, signedOffAt: null },
    { id: 'p-aisha', name: 'Aisha Wanjiku', role: null, managingOnly: false, signedOffAt: null },
  ],
  checkInGrid: {
    sessions: [1],
    rows: [
      { participantId: 'p-lead', name: 'Wanjiru Lead', role: null, managingOnly: true, cells: { '1': 'done' } },
      { participantId: 'p-aisha', name: 'Aisha Wanjiku', role: null, managingOnly: false, cells: { '1': 'done' } },
    ],
  },
  blockers: [
    {
      id: 'b1', who: 'Aisha Wanjiku', name: 'a fix for the pipeline', state: 'blocking' as const,
      says: 'Aisha Wanjiku is waiting on the pipeline for a fix for the pipeline.',
      raised: { times: 1, firstRaisedAt: '2026-09-29', lastRaisedAt: '2026-09-29', says: 'This was raised once, on 29 September.', sessions: [1], inSessions: 'It was raised in session 1.' },
      proof: { state: 'none', says: 'Nothing on record proves it yet.' }, timeGiven: 'No time has been given for it.',
      wouldClearIt: null, wouldClearItSays: 'Nobody has said what would clear it yet.', holdingUp: null,
    },
  ],
  openIssues: { why: 'Nothing on record follows an issue from unclear to decided to done and checked.' },
}

const PARTICIPANT_BOARD = {
  ...LEAD_BOARD,
  myParticipantId: 'p-aisha',
  yourShare: [],
  yourShareSays: 'There is no number of yours on this board yet, so there is no share to show.',
}

function renderBoard(board: any, at = '/grounds/g1/board') {
  ;(boardApi.get as any).mockResolvedValue(board)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[at]}>
        <Routes><Route path="/grounds/:id/board" element={<BoardPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('fix 11, on a project board', () => {
  /*
   * Screen match, 16 October: the lead of an engineering release first reads eng-board.jpg's own board, which has no
   * "Open issues". Nothing is lost: "See every other part of this board" opens the whole board as it was, where this
   * fix's guarantee holds exactly as before.
   */
  it('keeps the whole board one tap away from the board drawn as pictured', async () => {
    me = { id: 'p-lead', firstName: 'Wanjiru', role: 'MEMBER' }
    renderBoard(LEAD_BOARD)
    await screen.findByRole('heading', { name: 'Engineering release, test' })
    expect(screen.getByRole('link', { name: 'See every other part of this board' }).getAttribute('href')).toBe('/grounds/g1/board?whole=1')
  })

  it('puts "Who checked in" before "Blockers", and moves "Open issues" into the end fold', async () => {
    me = { id: 'p-lead', firstName: 'Wanjiru', role: 'MEMBER' }
    renderBoard(LEAD_BOARD, '/grounds/g1/board?whole=1')
    await screen.findByRole('heading', { name: 'Engineering release, test' })

    const body = document.body.textContent ?? ''
    const whoCheckedIn = body.indexOf('Who checked in')
    const blockers = body.indexOf('Blockers')
    expect(whoCheckedIn).toBeGreaterThanOrEqual(0)
    expect(blockers).toBeGreaterThan(whoCheckedIn)

    // "Open issues" is not above the fold...
    const fold = screen.getByText('Everything else from this check-in').closest('details') as HTMLElement
    expect(within(fold).getByText('Open issues')).toBeTruthy()
    // ...only inside it.
    const beforeFold = body.slice(0, body.indexOf('Everything else from this check-in'))
    expect(beforeFold.includes('Open issues')).toBe(false)
  })

  it('draws yourShareSays as "Your share" for the engineering participant, not only sales', async () => {
    me = { id: 'p-aisha', firstName: 'Aisha', role: 'MEMBER' }
    renderBoard(PARTICIPANT_BOARD)
    await screen.findByRole('heading', { name: 'Engineering release, test' })
    expect(screen.getByText('Your share')).toBeTruthy()
    expect(screen.getByText('There is no number of yours on this board yet, so there is no share to show.')).toBeTruthy()
  })
})
