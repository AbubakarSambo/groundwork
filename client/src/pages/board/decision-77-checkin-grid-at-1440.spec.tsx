import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage } from './BoardPage'
import { boardApi } from '@/api/board'
import { groundsApi } from '@/api/grounds'

/**
 * DECISION 77, AT 1440: A ROW NOT LET IN YET, MATCHED FROM THE GROUND'S OWN PARTICIPANTS.
 *
 * Walked live on the sales board after the engine's merge of 2 October (7bcfd919, merged as
 * 49b36c24): the desktop "Who checked in" table drew ordinary squares for Faraji Odhiambo, held
 * at the organisation's door - squares that can only ever read as missed sessions, for someone who
 * was never let in to answer any of them. The board's own `checkInGrid` row carries no
 * `notLetInYet` (it is a fact about the organisation, not this check-in's record); it is matched
 * from the ground's own `participants` (`GET /grounds/:id`) instead. The phone-width equivalent is
 * covered in nine-columns-is-not-a-phone-screen.spec.tsx.
 */
let currentUser = { id: 'u-rukia', firstName: 'Reader', role: 'MEMBER' }
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: currentUser }) }))
vi.mock('@/api/board', () => ({ boardApi: { get: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn() } }))
vi.mock('@/api/today', () => ({ todayApi: { get: vi.fn().mockResolvedValue({ count: 0, line: null, comingUp: [], needs: [] }) } }))
vi.mock('@/components/gw/HowThisHasMoved', () => ({ HowThisHasMoved: () => null }))
vi.mock('@/components/gw/ResolutionPanel', () => ({ ResolutionPanel: () => null }))
vi.mock('@/components/gw/WhatSuccessLooksLike', () => ({ WhatSuccessLooksLikeFor: () => null }))
vi.mock('@/components/gw/TheOtherBoardsYouAreIn', () => ({ TheOtherBoardsYouAreIn: () => null }))

const PARTICIPANTS = [
  { id: 'p-rukia', name: 'Rukia Otieno', role: null, managingOnly: false, signedOffAt: null },
  { id: 'p-amani', name: 'Amani Wekesa', role: null, managingOnly: false, signedOffAt: null },
]
const DEFAULT_GROUND = { initiatorId: 'u-rukia', timelineDays: 90, cadence: 'WEEKLY', leadFirstName: 'Rukia', participants: [] }

function renderAs(user: { id: string }, board: any, ground: any = DEFAULT_GROUND) {
  currentUser = { ...user, firstName: 'Reader', role: 'MEMBER' }
  ;(boardApi.get as any).mockResolvedValue(board)
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

describe('decision 77, at 1440: a row not let in yet, matched from the ground\'s own participants', () => {
  it('reads "Faraji Odhiambo is waiting to be let in." instead of drawing the usual squares', async () => {
    const board = {
      groundId: 'g1', renders: true, mode: 'SHARED', family: 'DELIVERY', title: 'Sales team, Q3', scenario: 'OKR_ALIGNMENT',
      coverageVariant: 'text', lastChangedAt: '2026-09-23T15:02:00.000Z',
      sections: ['checkInGrid'], myParticipantId: 'p-rukia', canEditFrame: true, readOnlyNote: null,
      participants: [...PARTICIPANTS, { id: 'p-faraji', name: 'Faraji Odhiambo', role: null, managingOnly: false, signedOffAt: null }],
      checkInGrid: {
        sessions: [1, 2],
        rows: [
          { participantId: 'p-rukia', name: 'Rukia Otieno', cells: { '1': 'done', '2': 'done' } },
          { participantId: 'p-faraji', name: 'Faraji Odhiambo', cells: { '1': 'not-started', '2': 'na' } },
        ],
      },
    }
    /* The board's own checkInGrid row carries no `notLetInYet` - it is read from the ground's own
       `participants` (`GET /grounds/:id`), matched back by participant id. */
    const ground = { ...DEFAULT_GROUND, participants: [
      { id: 'p-rukia', notLetInYet: false },
      { id: 'p-faraji', notLetInYet: true },
    ] }
    renderAs({ id: 'u-rukia' }, board, ground)
    await screen.findByRole('heading', { name: 'Sales team, Q3' })
    await screen.findByText('Who checked in')
    expect(screen.getByText('Faraji Odhiambo is waiting to be let in.')).toBeTruthy()
  })
})
