import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage } from './BoardPage'
import { boardApi } from '@/api/board'

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
    get: vi.fn().mockResolvedValue({
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
    }),
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

function renderBoard(payload: any) {
  ;(boardApi.get as any).mockResolvedValue(payload)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds/g1/board']}>
        <Routes><Route path="/grounds/:id/board" element={<BoardPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('the Reports section, as the lead and as a participant', () => {
  it('gives the lead "Not shared" and a "Share it" button', async () => {
    me = { id: 'u-lead', firstName: 'Wairimu', role: 'MEMBER' }
    renderBoard(AS_THE_LEAD)
    expect(await screen.findByText('Not shared')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Share it' })).toBeInTheDocument()
    expect(screen.queryByText(/Rukia shares it/)).not.toBeInTheDocument()
  })

  it('tells a participant who shares it, by name, with no button to press', async () => {
    me = { id: 'u-aisha', firstName: 'Aisha', role: 'MEMBER' }
    renderBoard(AS_AISHA)
    expect(await screen.findByText('Not shared yet. Rukia shares it.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Share it' })).not.toBeInTheDocument()
    /* Aisha has her own report on this session (c-aisha-1), so she can still open it. */
    expect(screen.getByRole('button', { name: 'Open' })).toBeInTheDocument()
  })
})
