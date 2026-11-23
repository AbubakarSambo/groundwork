import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage } from './BoardPage'
import { boardApi } from '@/api/board'
import { groundsApi } from '@/api/grounds'

const DEFAULT_GROUND = {
  initiatorId: 'u-lead',
  leadFirstName: 'Rukia',
  participants: [
    { id: 'p-lead', userId: 'u-lead', managingOnly: true },
    { id: 'p-aisha', userId: 'u-aisha', managingOnly: false },
  ],
  checkIns: [
    { id: 'c-lead-1', participantId: 'p-lead', sessionNumber: 1, status: 'COMPLETED', isSetup: false, availableFrom: null, completedAt: '2026-09-20T09:00:00.000Z' },
    { id: 'c-aisha-1', participantId: 'p-aisha', sessionNumber: 1, status: 'COMPLETED', isSetup: false, availableFrom: null, completedAt: '2026-09-21T09:00:00.000Z' },
  ],
  roundCompletions: [],
}

/**
 * BOARD REVIEW, 1 OCTOBER, ITEM 1: A PARTICIPANT IS NO LONGER TOLD TO SHARE THE TEAM REPORT.
 *
 * Every reader of the board's Reports section used to get the lead's own row for a session that
 * had not been shared - "A decision for you.", a "Not shared" tag and a "Share it" button - even
 * though only whoever runs the check-in can share a round. A participant now reads who will share
 * it, by name, and gets no button for a session that is not theirs; "Open" still works for a
 * session where they have their own report.
 */
let me: any = { id: 'u-lead', firstName: 'Wairimu', role: 'MEMBER' }
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: me }) }))
vi.mock('@/api/board', () => ({ boardApi: { get: vi.fn() } }))
vi.mock('@/api/grounds', () => ({
  groundsApi: {
    get: vi.fn(),
  },
}))
vi.mock('@/api/today', () => ({ todayApi: { get: vi.fn().mockResolvedValue({ count: 0, line: null, comingUp: [], needs: [] }) } }))
vi.mock('@/components/gw/HowThisHasMoved', () => ({ HowThisHasMoved: () => null }))
vi.mock('@/components/gw/ResolutionPanel', () => ({ ResolutionPanel: () => null }))
vi.mock('@/components/gw/WhatSuccessLooksLike', () => ({ WhatSuccessLooksLikeFor: () => null }))
vi.mock('@/components/gw/TheOtherBoardsYouAreIn', () => ({ TheOtherBoardsYouAreIn: () => null }))

const base = {
  groundId: 'g1', renders: true, mode: 'SHARED', family: 'DELIVERY', title: 'Sales team, Q3', scenario: 'OKR_ALIGNMENT',
  coverageVariant: 'text', lastChangedAt: '2026-09-23T15:02:00.000Z',
  sections: ['checkInGrid'],
  participants: [
    { id: 'p-lead', name: 'Wairimu Kamau', role: null, managingOnly: true, signedOffAt: null },
    { id: 'p-aisha', name: 'Aisha Otieno', role: null, managingOnly: false, signedOffAt: null },
  ],
  /* `cells` is keyed by session number as a string (Record<string, string>, api/board.ts), not
     an array - fixed here (screen fault 9, part 2) so a party actually on session 1 is read as
     on it, once BoardPage.tsx starts reading this grid to tell buildSessionRows who is really on
     each session. */
  checkInGrid: {
    sessions: [1],
    rows: [
      { participantId: 'p-lead', name: 'Wairimu Kamau', managingOnly: true, cells: { '1': 'done' } },
      { participantId: 'p-aisha', name: 'Aisha Otieno', managingOnly: false, cells: { '1': 'done' } },
    ],
  },
}
const AS_THE_LEAD = { ...base, myParticipantId: 'p-lead', canEditFrame: true, readOnlyNote: null }
const AS_AISHA = { ...base, myParticipantId: 'p-aisha', canEditFrame: false, readOnlyNote: null }

/** Renders where navigation actually landed, so a test can prove "Share it" goes somewhere real. */
function WhereWeLanded() {
  const loc = useLocation()
  return <div data-testid="landed">{loc.pathname}{loc.search}</div>
}

/** Each test picks its own ground fixture; defaults back so one test's override never leaks. */
beforeEach(() => {
  ;(groundsApi.get as any).mockResolvedValue(DEFAULT_GROUND)
})

function renderBoard(payload: any) {
  ;(boardApi.get as any).mockResolvedValue(payload)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds/g1/board']}>
        <Routes>
          <Route path="/grounds/:id/board" element={<BoardPage />} />
          <Route path="*" element={<WhereWeLanded />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

/* 23 November (journey 3): a report row's action is a link on the right of the row (design guide, rule 9), so these read it as a
   link to where it goes. Who is offered "Share it", and where it leads, are unchanged. */
describe('the Reports section, as the lead and as a participant', () => {
  it('gives the lead "Not shared" and a "Share it" button', async () => {
    me = { id: 'u-lead', firstName: 'Wairimu', role: 'MEMBER' }
    renderBoard(AS_THE_LEAD)
    expect(await screen.findByText('Not shared')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Share it' })).toBeInTheDocument()
    expect(screen.queryByText(/Rukia shares it/)).not.toBeInTheDocument()
  })

  /*
   * SCREEN FAULT 1 (FINAL WALK): "NOT SHARED" EVEN THOUGH THE REPORT WAS RELEASED. A session's
   * round can close (`roundCompletions`) without ever being shared, and - the other way round - a
   * lead can release a session before the round closes. The tag must follow `report.releasedAt` /
   * `report.releasedSessions`, never `roundCompletions` alone.
   */
  it('reads "Shared" once the report is actually released, even with the round still open', async () => {
    me = { id: 'u-lead', firstName: 'Wairimu', role: 'MEMBER' }
    /* Released early (report.releasedAt set), with nobody recorded as closing the round - the
       lead shared it, not because everyone answered. */
    ;(groundsApi.get as any).mockResolvedValue({
      ...DEFAULT_GROUND,
      report: { releasedAt: '2026-09-21T10:00:00.000Z', releasedSessions: [1] },
    })
    renderBoard(AS_THE_LEAD)
    expect(await screen.findByText('Shared')).toBeInTheDocument()
    expect(screen.queryByText('Not shared')).not.toBeInTheDocument()
    /* Already shared, so there is nothing left for the lead to press to share it. */
    expect(screen.queryByRole('link', { name: 'Share it' })).not.toBeInTheDocument()
  })

  it('sends the lead to the report tab, which actually has a way to share it, never to a page with no share button', async () => {
    me = { id: 'u-lead', firstName: 'Wairimu', role: 'MEMBER' }
    renderBoard(AS_THE_LEAD)
    const shareIt = await screen.findByRole('link', { name: 'Share it' })
    shareIt.click()
    /* Not /grounds/g1/session/1 - RoundReportPage.tsx has no share or send control. */
    expect(await screen.findByTestId('landed')).toHaveTextContent('/grounds/g1?tab=report')
  })

  it('tells a participant who shares it, by name, with no button to press', async () => {
    me = { id: 'u-aisha', firstName: 'Aisha', role: 'MEMBER' }
    renderBoard(AS_AISHA)
    expect(await screen.findByText('Not shared yet. Rukia shares it.')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Share it' })).not.toBeInTheDocument()
    /* Aisha has her own report on this session (c-aisha-1), so she can still open it. */
    expect(screen.getByRole('link', { name: 'Open' })).toBeInTheDocument()
  })
})
