import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage } from './BoardPage'
import { boardApi } from '@/api/board'
import { groundsApi } from '@/api/grounds'

/**
 * RE-REVIEW, 30 SEPTEMBER, SECOND PASS: item 1 (the reader as "you" on targets, contribution and
 * decisions) and item 7 (the Reports note for a reader who is not a participant at all).
 */
let currentUser = { id: 'u-rukia', firstName: 'Reader', role: 'MEMBER' }
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: currentUser }) }))
vi.mock('@/api/board', () => ({ boardApi: { get: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn() } }))
const DEFAULT_GROUND = { initiatorId: 'u-rukia', timelineDays: 90, cadence: 'WEEKLY', leadFirstName: 'Rukia' }
vi.mock('@/api/today', () => ({ todayApi: { get: vi.fn().mockResolvedValue({ count: 0, line: null, comingUp: [], needs: [] }) } }))
vi.mock('@/components/gw/HowThisHasMoved', () => ({ HowThisHasMoved: () => null }))
vi.mock('@/components/gw/ResolutionPanel', () => ({ ResolutionPanel: () => null }))
vi.mock('@/components/gw/WhatSuccessLooksLike', () => ({ WhatSuccessLooksLikeFor: () => null }))
vi.mock('@/components/gw/TheOtherBoardsYouAreIn', () => ({ TheOtherBoardsYouAreIn: () => null }))

const PARTICIPANTS = [
  { id: 'p-rukia', name: 'Rukia Otieno', role: null, managingOnly: true, signedOffAt: null },
  { id: 'p-amani', name: 'Amani Wekesa', role: null, managingOnly: false, signedOffAt: null },
]

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

describe('re-review, 30 September, second pass - item 1: the reader as "you"', () => {
  it('reads "Your own target" for the reader\'s own objective, not their own name', async () => {
    const board = {
      groundId: 'g1', renders: true, mode: 'SHARED', family: 'DELIVERY', title: 'Sales team, Q3', scenario: 'OKR_ALIGNMENT',
      coverageVariant: 'text', lastChangedAt: '2026-09-23T15:02:00.000Z',
      sections: ['objectives'], myParticipantId: 'p-rukia', canEditFrame: true, readOnlyNote: null,
      participants: PARTICIPANTS,
      objectives: [{
        id: 'o-rukia', name: 'Rukia’s own target', count: 0, prevCount: 0, target: 4, delta: 0, isNew: false, askedOf: null,
        suggestedCount: null, notSettled: null, owner: 'Rukia Otieno', ownerParticipantId: 'p-rukia',
        journey: { direction: 'unknown' as const, start: null, now: 0, target: 4, say: '', covered: null },
      }],
    }
    renderAs({ id: 'u-rukia' }, board)
    await screen.findByRole('heading', { name: 'Sales team, Q3' })
    expect(screen.getByText('Your own target')).toBeTruthy()
    expect(screen.queryByText('Rukia Otieno’s own target')).toBeNull()
  })

  it('reads "Nobody has said what your role covers yet." on the reader\'s own contribution card', async () => {
    const board = {
      groundId: 'g1', renders: true, mode: 'SHARED', family: 'DELIVERY', title: 'Sales team, Q3', scenario: 'OKR_ALIGNMENT',
      coverageVariant: 'text', lastChangedAt: '2026-09-23T15:02:00.000Z',
      sections: ['contribution'], myParticipantId: 'p-rukia', canEditFrame: true, readOnlyNote: null,
      participants: PARTICIPANTS,
      contribution: [
        /* One row with a defined role, so the board does not collapse into its "Everyone here"
           variant (only shown when EVERY row is undefined) - the real capture this is drawn from
           always has at least one, and it is the per-person listing this test is about. */
        { participantId: 'p-faraji', name: 'Faraji Odhiambo', remitDefined: true, reason: 'I sell fridges in Kilimani.', shown: false, basis: 'Based on 1 check-in.' },
        { participantId: 'p-amani', name: 'Amani Wekesa', remitDefined: false, note: 'No position shown, because the role was never clearly defined.' },
        { participantId: 'p-rukia', name: 'Rukia Otieno', remitDefined: false, note: 'No position shown, because the role was never clearly defined.' },
      ],
    }
    renderAs({ id: 'u-rukia' }, board)
    await screen.findByRole('heading', { name: 'Sales team, Q3' })
    /* Contribution is gated on `viewerRunsThisCheckIn`, which depends on a second query
       (groundsApi.get) that resolves after the board's own - so this waits for the sentence
       rather than assuming it is already there. */
    expect(await screen.findByText('Nobody has said what your role covers yet.')).toBeTruthy()
    expect(screen.getByText("Nobody has said what Amani's role covers yet.")).toBeTruthy()
    expect(screen.queryByText("Nobody has said what Rukia's role covers yet.")).toBeNull()
  })

  it('reads "You" for a decision owned by the reader themselves', async () => {
    const board = {
      groundId: 'g1', renders: true, mode: 'SHARED', family: 'DELIVERY', title: 'Sales team, Q3', scenario: 'OKR_ALIGNMENT',
      coverageVariant: 'text', lastChangedAt: '2026-09-23T15:02:00.000Z',
      sections: ['decisions'], myParticipantId: 'p-rukia', canEditFrame: true, readOnlyNote: null,
      participants: PARTICIPANTS,
      decisions: [{ question: 'Does a price range count as a budget?', why: 'It decides whether 4 deals count as qualified.', owner: 'Rukia Otieno', source: 'divergence' }],
    }
    renderAs({ id: 'u-rukia' }, board)
    await screen.findByRole('heading', { name: 'Sales team, Q3' })
    expect(await screen.findByText('You', { selector: 'span' })).toBeTruthy()
    expect(screen.queryByText('Rukia Otieno', { selector: 'span' })).toBeNull()
  })
})

describe('re-review, 30 September, second pass - item 7: Reports, for a reader who is not a participant', () => {
  it('reads "Each session has a team report, once Rukia shares it." to an admin who is not in the check-in', async () => {
    const board = {
      groundId: 'g1', renders: true, mode: 'SHARED', family: 'DELIVERY', title: 'Sales team, Q3', scenario: 'OKR_ALIGNMENT',
      coverageVariant: 'text', lastChangedAt: '2026-09-23T15:02:00.000Z',
      sections: ['checkInGrid'], myParticipantId: null, canEditFrame: false, readOnlyNote: null,
      participants: PARTICIPANTS,
      checkInGrid: { sessions: [1], rows: [{ participantId: 'p-amani', cells: { '1': 'done' } }] },
    }
    /* `sessionRows` (the Reports table's own data) is built client-side from the ground's raw
       check-ins, fetched separately from the board - not from the board payload above. */
    const ground = {
      ...DEFAULT_GROUND,
      participants: [
        { id: 'p-rukia', userId: 'u-rukia', partyType: 'INITIATOR', managingOnly: true },
        { id: 'p-amani', userId: 'u-amani', partyType: 'PARTICIPANT', managingOnly: false },
      ],
      checkIns: [{ id: 'ci-1', participantId: 'p-amani', sessionNumber: 1, status: 'COMPLETED', isSetup: false, availableFrom: '2026-09-27T10:00:00.000Z', completedAt: '2026-09-27T11:00:00.000Z' }],
      roundCompletions: [],
    }
    renderAs({ id: 'u-juma' }, board, ground)
    await screen.findByRole('heading', { name: 'Sales team, Q3' })
    expect(await screen.findByText('Each session has a team report, once Rukia shares it.')).toBeTruthy()
  })
})
