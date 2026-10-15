import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage } from './BoardPage'
import { boardApi } from '@/api/board'

/**
 * THE SECOND BOARD REVIEW: COACHING IS SENT BUT DRAWN NOWHERE ON THE BOARD.
 *
 * The server already sends `coaching.yours` to every reader who has one, and `coaching.eachPerson`
 * to whoever runs the check-in - see board.service.ts. This pins that the board now draws both, in
 * the same shape the report page already uses for the same fields (`WhatToWorkOnNext` and
 * `WhatToProbeThemOn`): Wairimu, who runs the check-in, reads her own note and her read on Aisha;
 * Aisha, a participant, reads only her own note and never Wairimu's read on her.
 */
vi.mock('@/api/patterns', () => ({ patternsApi: { answer: vi.fn() } }))
let me = { id: 'u-wairimu', firstName: 'Wairimu', role: 'MEMBER' }
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: me }) }))
vi.mock('@/api/board', () => ({ boardApi: { get: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn().mockResolvedValue({ initiatorId: 'u-wairimu' }) } }))
vi.mock('@/api/today', () => ({ todayApi: { get: vi.fn().mockResolvedValue({ count: 0, line: null, comingUp: [], needs: [] }) } }))
vi.mock('@/components/gw/HowThisHasMoved', () => ({ HowThisHasMoved: () => null }))
vi.mock('@/components/gw/ResolutionPanel', () => ({ ResolutionPanel: () => null }))
vi.mock('@/components/gw/WhatSuccessLooksLike', () => ({ WhatSuccessLooksLikeFor: () => null }))
vi.mock('@/components/gw/TheOtherBoardsYouAreIn', () => ({ TheOtherBoardsYouAreIn: () => null }))

const base = {
  groundId: 'g1', renders: true, mode: 'SHARED', family: 'DELIVERY', sections: ['objectives'],
  title: 'Sales team, Q3', scenario: 'OKR_ALIGNMENT', coverageVariant: 'text',
  lastChangedAt: '2026-09-23T15:02:00.000Z',
  participants: [
    { id: 'p-lead', name: 'Wairimu Kamau', role: null, managingOnly: true, signedOffAt: null },
    { id: 'p-aisha', name: 'Aisha Otieno', role: null, managingOnly: false, signedOffAt: null },
  ],
  canEditFrame: false, readOnlyNote: null,
}

const YOURS = {
  aboutYou: [], showingUp: null,
  whyItMatters: 'This is session 2 of sales and expansion work. Nothing repeats yet, which is normal this early.',
  beforeNextTime: ['You will put the price list in writing to Rukia Otieno, with the date you need it by.'],
  general: true,
  role: {
    label: 'Sales and expansion',
    onTrack: 'Named buyers with budget and authority.',
    goingWrong: 'Plenty of activity, no named buyer who can actually decide.',
    protectAgainst: 'You are made to feel like a failure by a broken internal clock.',
    noticed: null, lookingLike: null,
  },
  whyNoRoleMap: null,
}

const EACH_PERSON = [
  {
    who: 'Aisha Otieno', participantId: 'p-aisha',
    probe: ['Waiting for 4 days on you for the price list. Ask what that is waiting on.'],
    encourage: ['Attached a document, so their side can be checked rather than taken on trust.'],
    triedToUnblock: 'The record does not say what they did about it.',
  },
]

const AS_THE_LEAD = { ...base, myParticipantId: 'p-lead', coaching: { yours: YOURS, eachPerson: EACH_PERSON } }
const AS_A_PARTICIPANT = { ...base, myParticipantId: 'p-aisha', coaching: { yours: YOURS, eachPerson: null } }

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

describe('coaching is drawn for each reader', () => {
  beforeEach(() => vi.clearAllMocks())

  it('Wairimu, who runs it, reads her own note and her read on Aisha', async () => {
    me = { id: 'u-wairimu', firstName: 'Wairimu', role: 'MEMBER' }
    renderBoard(AS_THE_LEAD)
    expect(await screen.findByText('What to work on next')).toBeTruthy()
    expect(screen.getByText(/This is session 2 of sales and expansion work/)).toBeTruthy()
    expect(screen.getByText('What to ask each person')).toBeTruthy()
    expect(screen.getByText('Aisha Otieno')).toBeTruthy()
    expect(screen.getByText(/Waiting for 4 days on you for the price list/)).toBeTruthy()
  })

  it('Aisha, a participant, reads only her own note, never a read on herself', async () => {
    me = { id: 'u-aisha', firstName: 'Aisha', role: 'MEMBER' }
    renderBoard(AS_A_PARTICIPANT)
    expect(await screen.findByText('What to work on next')).toBeTruthy()
    expect(screen.getByText(/This is session 2 of sales and expansion work/)).toBeTruthy()
    expect(screen.queryByText('What to ask each person')).toBeNull()
    expect(screen.queryByText(/Waiting for 4 days on you for the price list/)).toBeNull()
  })
})
