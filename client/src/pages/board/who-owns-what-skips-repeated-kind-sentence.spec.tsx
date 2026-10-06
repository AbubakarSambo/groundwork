import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage } from './BoardPage'
import { boardApi } from '@/api/board'
import { groundsApi } from '@/api/grounds'

/**
 * "WHO OWNS WHAT": THE RECORD-TYPE SENTENCE IS NOT DRAWN WHEN THE ITEM'S OWN TEXT ALREADY SAYS IT.
 *
 * After the engine's merge of 2 October (7bcfd919, merged as 49b36c24), walked live on the sales
 * board: "You have reported progress. This is progress you reported." - `it.text` itself already
 * said what kind of item this was, in its own words, and `whatThisItemIs` drew the same fact again
 * underneath it. `it.itsKindIsSaid` now means that sentence is skipped.
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

describe('"Who owns what": the record-type sentence is not drawn when the item\'s own text already says it', () => {
  it('does not repeat "This is progress you reported." under "You have reported progress."', async () => {
    const board = {
      groundId: 'g1', renders: true, mode: 'SHARED', family: 'DELIVERY', title: 'Sales team, Q3', scenario: 'OKR_ALIGNMENT',
      coverageVariant: 'text', lastChangedAt: '2026-09-23T15:02:00.000Z',
      sections: ['whoOwnsWhat'], myParticipantId: 'p-rukia', canEditFrame: true, readOnlyNote: null,
      participants: PARTICIPANTS,
      whoOwnsWhat: [
        {
          participantId: 'p-rukia', name: 'Rukia Otieno', role: null,
          items: [{ id: 'i1', type: 'PROGRESS', text: 'You have reported progress.', sessionNumber: 1, itsKindIsSaid: true }],
        },
        {
          participantId: 'p-amani', name: 'Amani Wekesa', role: null,
          items: [{ id: 'i2', type: 'PROGRESS', text: 'Amani Wekesa said, "Delivered the cookers."', sessionNumber: 1 }],
        },
      ],
    }
    renderAs({ id: 'u-rukia' }, board)
    await screen.findByRole('heading', { name: 'Sales team, Q3' })
    expect(await screen.findByText('You have reported progress.')).toBeTruthy()
    expect(screen.queryByText('This is progress you reported.')).toBeNull()
    // Unaffected: a plain item with no `itsKindIsSaid` still draws its record-type sentence.
    expect(screen.getByText('This is progress Amani Wekesa reported.')).toBeTruthy()
  })
})
