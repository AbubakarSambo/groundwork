import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage } from './BoardPage'
import { boardApi } from '@/api/board'
import { groundsApi } from '@/api/grounds'

/**
 * "WHERE WORK IS LANDING": EACH HEADING ONLY WITH ITS OWN TEXT, AND THE REPEATED SENTENCE DRAWN
 * ONCE.
 *
 * After the engine's merge of 2 October (7bcfd919, merged as 49b36c24), walked live on the sales
 * board: "What people said" and "Which of these this is" drew with nothing underneath, for a row
 * whose sentence repeated another's - the engine now sends `what: null` / `reasonText: null` (with
 * `saidOnceAbove: true`) for that row, with the repeated words moved once into `coverage.saysOnce`,
 * which the client never drew.
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

describe('"Where work is landing": each heading only with its own text, and the repeated sentence drawn once', () => {
  it('leaves out "What people said" and "Which of these this is" when the row carries neither, and draws coverage.saysOnce once above the rows', async () => {
    const board = {
      groundId: 'g1', renders: true, mode: 'SHARED', family: 'DELIVERY', title: 'Sales team, Q3', scenario: 'OKR_ALIGNMENT',
      coverageVariant: 'text', lastChangedAt: '2026-09-23T15:02:00.000Z',
      sections: ['coverage'], myParticipantId: 'p-rukia', canEditFrame: true, readOnlyNote: null,
      participants: PARTICIPANTS,
      coverage: {
        scope: 'role',
        reads: [
          {
            participantId: 'p-rukia', name: 'Rukia Otieno', scope: 'role', kind: 'STABLE', trend: 'stable',
            what: null, reason: 'CANNOT_DETERMINE', reasonText: null, ownVoice: null,
            coupledToBlocker: false, remitDefined: false, shown: true,
            basis: 'Based on 2 check-ins, 0 checkable things named, none of it confirmed by anyone else.',
            saidOnceAbove: true,
          },
          {
            participantId: 'p-amani', name: 'Amani Wekesa', scope: 'role', kind: 'STABLE', trend: 'stable',
            what: null, reason: 'CANNOT_DETERMINE', reasonText: null, ownVoice: null,
            coupledToBlocker: true, remitDefined: false, shown: true, saidOnceAbove: true,
          },
        ],
        saysOnce: [
          'The role was never defined, so there is no boundary to measure against. This is true of Rukia Otieno and Amani Wekesa.',
          'The role was never clearly defined, so there is no boundary to measure work against. Define what this role owns before reading anything into where work is landing.',
        ],
      },
    }
    renderAs({ id: 'u-rukia' }, board)
    await screen.findByRole('heading', { name: 'Sales team, Q3' })
    await screen.findByText('Where work is landing')
    expect(screen.getByText(/This is true of Rukia Otieno and Amani Wekesa\./)).toBeTruthy()
    expect(screen.getByText(/Define what this role owns before reading anything into where work is landing\./)).toBeTruthy()
    expect(screen.queryByText('What people said')).toBeNull()
    expect(screen.queryByText('Which of these this is')).toBeNull()
  })

  it('still draws "What people said" and "Which of these this is" for a row that carries its own text', async () => {
    const board = {
      groundId: 'g1', renders: true, mode: 'SHARED', family: 'DELIVERY', title: 'Sales team, Q3', scenario: 'OKR_ALIGNMENT',
      coverageVariant: 'text', lastChangedAt: '2026-09-23T15:02:00.000Z',
      sections: ['coverage'], myParticipantId: 'p-rukia', canEditFrame: true, readOnlyNote: null,
      participants: PARTICIPANTS,
      coverage: {
        scope: 'role',
        reads: [{
          participantId: 'p-amani', name: 'Amani Wekesa', scope: 'role', kind: 'STABLE', trend: 'stable',
          what: 'Amani said she closed two accounts this week.', reason: 'CANNOT_DETERMINE',
          reasonText: 'Nothing has shifted this week.', ownVoice: null,
          coupledToBlocker: false, remitDefined: true, shown: true,
        }],
      },
    }
    renderAs({ id: 'u-rukia' }, board)
    await screen.findByRole('heading', { name: 'Sales team, Q3' })
    expect(await screen.findByText('What people said')).toBeTruthy()
    expect(screen.getByText('Amani said she closed two accounts this week.')).toBeTruthy()
    expect(screen.getByText('Which of these this is')).toBeTruthy()
    expect(screen.getByText('Nothing has shifted this week.')).toBeTruthy()
  })
})
