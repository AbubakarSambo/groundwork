import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage } from './BoardPage'
import { boardApi } from '@/api/board'
import { groundsApi } from '@/api/grounds'

/**
 * BOARD TASK, PHASE 2, PART B: THE PARTICIPANT'S OWN VIEW (B5's board-as-participant.txt).
 *
 * A participant's board now leads with a short personal view - whether today's team picture is
 * shared, a way to their own report, and their own records, "Only yours" - with everything the
 * board already gave them folded below it under one name, "The whole check-in", so nothing they
 * could read today is taken away. The lead's own board is unchanged by any of this.
 */
let me = { id: 'u-miriam', firstName: 'Miriam', role: 'MEMBER' }
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: me }) }))
vi.mock('@/api/board', () => ({ boardApi: { get: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn() } }))
vi.mock('@/api/today', () => ({ todayApi: { get: vi.fn().mockResolvedValue({ count: 0, line: null, comingUp: [], needs: [] }) } }))
vi.mock('@/components/gw/HowThisHasMoved', () => ({ HowThisHasMoved: () => null }))
vi.mock('@/components/gw/ResolutionPanel', () => ({ ResolutionPanel: () => null }))
vi.mock('@/components/gw/WhatSuccessLooksLike', () => ({ WhatSuccessLooksLikeFor: () => null }))
vi.mock('@/components/gw/TheOtherBoardsYouAreIn', () => ({ TheOtherBoardsYouAreIn: () => null }))
vi.mock('@/components/gw/Suggestions', () => ({ SuggestionsForTheLead: () => null }))

const PARTICIPANTS = [
  { id: 'p-wairimu', name: 'Wairimu Kamau', role: null, managingOnly: true, signedOffAt: null },
  { id: 'p-miriam', name: 'Miriam Wanjiku', role: null, managingOnly: false, signedOffAt: null },
  { id: 'p-aisha', name: 'Aisha Otieno', role: null, managingOnly: false, signedOffAt: null },
]

const workRecords = [
  {
    section: 'Deal grid', holds: 'deals', state: 'filled' as const, stages: ['Need', 'Quoted', 'Signed'],
    rows: [
      { id: 'd-miriam-1', kind: 'deal', name: 'Westgate Deli', stage: 'Quoted', owner: 'Miriam Wanjiku', ownerParticipantId: 'p-miriam', due: null, fields: {}, from: 'said' as const, said: 'Quoted them KES 95,000.', saidBy: 'Miriam' },
      { id: 'd-aisha-1', kind: 'deal', name: 'Greenhill Mart', stage: 'Signed', owner: 'Aisha Otieno', ownerParticipantId: 'p-aisha', due: null, fields: {}, from: 'said' as const, said: 'Signed last week.', saidBy: 'Aisha' },
    ],
  },
]

function board(overrides: any = {}) {
  return {
    groundId: 'g1', renders: true, mode: 'SHARED', family: 'DELIVERY', sections: [],
    title: 'Sales team, Q3', scenario: 'NOT_A_REAL_SCENARIO', coverageVariant: 'text',
    lastChangedAt: '2026-09-23T15:02:00.000Z',
    participants: PARTICIPANTS,
    myParticipantId: 'p-miriam', canEditFrame: false, readOnlyNote: null,
    kindOfWork: 'sales org',
    workRecords,
    howItIsGoing: { latestSummary: null, glance: { progress: { roundsDone: 0, roundsPlanned: 12, answeredThisRound: 2, ofPeople: 3 }, inTheWay: { count: 0, oldest: null, daysWaiting: null } } },
    ...overrides,
  }
}

function renderBoard(payload: any, ground: any = { initiatorId: 'u-wairimu', leadFirstName: 'Wairimu' }) {
  ;(boardApi.get as any).mockResolvedValue(payload)
  ;(groundsApi.get as any).mockResolvedValue(ground)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds/g1/board']}>
        <Routes><Route path="/grounds/:id/board" element={<BoardPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('the participant’s own view, first (board-as-participant.txt)', () => {
  it('Miriam reads whether today’s picture is shared, a way to her own report, and only her own deals', async () => {
    me = { id: 'u-miriam', firstName: 'Miriam', role: 'MEMBER' }
    renderBoard(board())
    await screen.findByRole('heading', { name: 'Sales team, Q3' })

    // Nothing has been shared yet (no round is done): says so, and names the lead.
    expect(screen.getByText('Today’s team picture isn’t ready yet.')).toBeTruthy()
    expect(screen.getByText(/Wairimu hasn’t shared it yet\. Your own report is ready now\./)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Read your own report' })).toHaveAttribute('href', '/grounds/g1/report')

    // Her own deal, marked "Only yours" - in her own personal section, above the fold.
    const ownSection = screen.getByText('Your own deals, day by day').closest('section') as HTMLElement
    expect(within(ownSection).getByText('Only yours.')).toBeTruthy()
    expect(within(ownSection).getByText('Westgate Deli')).toBeTruthy()
    expect(within(ownSection).queryByText('Greenhill Mart')).toBeNull()

    // No "Your share" box: the engine sends no field for it yet (request 107), so nothing is drawn.
    expect(screen.queryByText(/Your share/)).toBeNull()

    // Everything else is still there, just folded under one name - including Aisha's deal, which
    // is never part of Miriam's own personal section above.
    expect(screen.getByText('The whole check-in')).toBeTruthy()
    const whole = screen.getByText('The whole check-in').closest('details') as HTMLElement
    expect(whole).toBeTruthy()
    expect(within(whole).getByText('Greenhill Mart')).toBeTruthy()
    expect(within(whole).getByText('Westgate Deli')).toBeTruthy()
  })

  it('says the picture is ready once a round has closed', async () => {
    me = { id: 'u-miriam', firstName: 'Miriam', role: 'MEMBER' }
    renderBoard(board({ howItIsGoing: { latestSummary: null, glance: { progress: { roundsDone: 1, roundsPlanned: 12, answeredThisRound: 3, ofPeople: 3 }, inTheWay: { count: 0, oldest: null, daysWaiting: null } } } }))
    await screen.findByRole('heading', { name: 'Sales team, Q3' })
    expect(screen.getByText('Today’s team picture is ready.')).toBeTruthy()
    expect(screen.queryByText('Today’s team picture isn’t ready yet.')).toBeNull()
  })

  it('Wairimu, who runs the check-in, reads her board exactly as before - no personal view, no fold', async () => {
    me = { id: 'u-wairimu', firstName: 'Wairimu', role: 'MEMBER' }
    renderBoard(board({ myParticipantId: 'p-wairimu', canEditFrame: true }))
    await screen.findByRole('heading', { name: 'Sales team, Q3' })
    expect(screen.queryByText('Today’s team picture isn’t ready yet.')).toBeNull()
    expect(screen.queryByText('Your own deals, day by day')).toBeNull()
    expect(screen.queryByText('The whole check-in')).toBeNull()
    // Her own and Aisha's deals are both plainly on the page, not behind a fold.
    expect(screen.getByText('Westgate Deli')).toBeTruthy()
    expect(screen.getByText('Greenhill Mart')).toBeTruthy()
  })
})
