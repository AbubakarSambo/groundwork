import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage } from './BoardPage'
import { boardApi } from '@/api/board'
import { groundsApi } from '@/api/grounds'

/**
 * "CONTRIBUTION AGAINST ROLE": THE REPEATED NOTE DRAWN ONCE, UNDER THE HEADING.
 *
 * After the engine's merge of 2 October (7bcfd919, merged as 49b36c24), a note repeated across
 * several cards ("No position shown...") moved once into `contributionSaysOnce`, above the cards,
 * with each card's own `note` nulled out (`saidOnceAbove: true`). The client never drew
 * `contributionSaysOnce`, so the fact disappeared from the screen entirely. Its words may name
 * this reader by their own name (request 118 asks the engine to stop that) - drawn as sent, never
 * rewritten on screen.
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

describe('"Contribution against role": the repeated note drawn once, under the heading', () => {
  it('draws contributionSaysOnce once, as the server sends it', async () => {
    const board = {
      groundId: 'g1', renders: true, mode: 'SHARED', family: 'DELIVERY', title: 'Sales team, Q3', scenario: 'OKR_ALIGNMENT',
      coverageVariant: 'text', lastChangedAt: '2026-09-23T15:02:00.000Z',
      sections: ['contribution'], myParticipantId: 'p-rukia', canEditFrame: true, readOnlyNote: null,
      participants: PARTICIPANTS,
      contribution: [
        { participantId: 'p-rukia', name: 'Rukia Otieno', remitDefined: false, note: null, reason: null, shown: false, basis: 'No role was defined, so there is nothing to read against.', saidOnceAbove: true },
        { participantId: 'p-amani', name: 'Amani Wekesa', remitDefined: false, note: null, reason: null, shown: true, saidOnceAbove: true },
      ],
      contributionSaysOnce: 'No position is shown for Rukia Otieno or Amani Wekesa, because nobody’s role was clearly defined. Define what each role is responsible for before assessing anyone against it. An undefined role is often the real problem, not the person.',
    }
    renderAs({ id: 'u-rukia' }, board)
    await screen.findByRole('heading', { name: 'Sales team, Q3' })
    expect(await screen.findByText(/No position is shown for Rukia Otieno or Amani Wekesa/)).toBeTruthy()
  })
})
