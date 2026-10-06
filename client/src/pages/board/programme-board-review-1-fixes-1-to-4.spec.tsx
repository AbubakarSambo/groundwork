import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage } from './BoardPage'
import { boardApi } from '@/api/board'

/**
 * THE TRADER TRAINING PROGRAMME BOARD, REVIEW 1: FIXES 1 TO 4 (docs/prototype/screens/
 * G1-example-check-ins/programme.txt).
 *
 * 1. The same targets-at-top, early-who-checked-in, folded-open-issues layout the support desk
 *    and distribution operations boards already have (`kindLayout` in BoardPage.tsx).
 * 2. "By county", not the plain "By area" (TheSwitchboardsSections.tsx's `BY_AREA_HEADING`).
 * 3. "Every trader, and what shows it" for the Deal grid's own heading, not "Every trader
 *    group" (WorkRecords.tsx's `DEAL_GRID_HEADING`).
 * 4. "The shape of the work" stays inside the Deal grid, next to its rows - there is no separate
 *    "Themes" work-record section for this kind to pull out beside "By county" the way support
 *    desk's and distribution operations' own "Themes" sections are (see the comment on the new
 *    `kindLayout` row in BoardPage.tsx).
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

const PROGRAMME_BOARD = {
  groundId: 'g1', renders: true, mode: 'PRIVATE', family: 'COHORT', title: 'Trader training programme, test', scenario: 'COHORT_CHECK',
  coverageVariant: 'text', lastChangedAt: '2026-09-29T18:02:00.000Z',
  sections: ['checkInGrid'],
  myParticipantId: 'p-lead', canEditFrame: true, readOnlyNote: null,
  kindOfWork: 'trader training programme' as const,
  participants: [
    { id: 'p-lead', name: 'Wanjiru Lead', role: null, managingOnly: true, signedOffAt: null },
    { id: 'p-aisha', name: 'Aisha Wanjiku', role: null, managingOnly: false, signedOffAt: null },
  ],
  eachPerson: [
    { participantId: 'p-aisha', who: 'Aisha Wanjiku', target: null, count: 1, reason: 'nothing to do', says: 'Aisha Wanjiku has checked in, and nothing here needs you this week.', ask: null },
  ],
  workRecords: [
    {
      section: 'Deal grid', holds: 'trader groups', state: 'filled',
      stages: ['Enrolled', 'Session 1', 'Session 2', 'Completed'],
      rows: [
        {
          id: 'w-1', kind: 'group', name: 'Gikomba traders, group A', stage: 'Session 1',
          owner: null, ownerParticipantId: null, due: null, fields: {}, from: 'lead', mark: 'none',
        },
      ],
    },
  ],
  byArea: { state: 'not-known', why: 'Nothing on record says which site, county, team or queue each piece of work belongs to, so the work cannot be shown by area yet.' },
  blockers: [],
  openIssues: { why: 'Nothing on record follows an issue from unclear to decided to done and checked.' },
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

describe('the trader training programme board, as the lead', () => {
  it('fix 3: heads the grid "Every trader, and what shows it", not "Every trader group"', async () => {
    me = { id: 'p-lead', firstName: 'Wanjiru', role: 'MEMBER' }
    renderBoard(PROGRAMME_BOARD)
    await screen.findByRole('heading', { name: 'Trader training programme, test' })
    const dealGrid = screen.getByRole('region', { name: 'Every trader, and what shows it' })
    expect(within(dealGrid).getByText('Gikomba traders, group A')).toBeTruthy()
    expect(screen.queryByText('Every trader group, and what shows it')).toBeNull()
  })

  it('fix 4: "The shape of the work" stays inside the grid, next to its rows', async () => {
    me = { id: 'p-lead', firstName: 'Wanjiru', role: 'MEMBER' }
    renderBoard(PROGRAMME_BOARD)
    await screen.findByRole('heading', { name: 'Trader training programme, test' })
    const dealGrid = screen.getByRole('region', { name: 'Every trader, and what shows it' })
    expect(within(dealGrid).getByText('The shape of the work')).toBeTruthy()
  })

  it('fixes 1 and 2: "By county" draws right after "The team today", and "Open issues" moves into the end fold', async () => {
    me = { id: 'p-lead', firstName: 'Wanjiru', role: 'MEMBER' }
    renderBoard(PROGRAMME_BOARD)
    await screen.findByRole('heading', { name: 'Trader training programme, test' })

    const body = document.body.textContent ?? ''
    const theTeamToday = body.indexOf('The team today')
    const byCounty = body.indexOf('By county')
    expect(theTeamToday).toBeGreaterThanOrEqual(0)
    expect(byCounty).toBeGreaterThan(theTeamToday)
    expect(screen.queryByText('By area')).toBeNull()

    // "Open issues" is not above the fold...
    const fold = screen.getByText('Everything else from this check-in').closest('details') as HTMLElement
    expect(within(fold).getByText('Open issues')).toBeTruthy()
    // ...only inside it.
    const beforeFold = body.slice(0, body.indexOf('Everything else from this check-in'))
    expect(beforeFold.includes('Open issues')).toBe(false)
  })
})
