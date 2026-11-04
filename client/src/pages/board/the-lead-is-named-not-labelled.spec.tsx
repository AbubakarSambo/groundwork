import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage } from './BoardPage'
import { boardApi } from '@/api/board'

/**
 * BOARD REVIEW, 1 OCTOBER, ITEM 4: "THE LEAD" WHERE THE LEAD IS THE READER, OR A NAME IS KNOWN.
 *
 * "The lead sets these targets." and "...stays in the lead's private report" said "the lead" even
 * to the lead themselves, reading their own board, and even where the board already knows the
 * lead's first name (`leadFirstName`) for a colleague reading it. Now: "You set these targets." /
 * "your private report" to the lead, and "{name} sets these targets." / "{name}'s private report"
 * to anybody else.
 */
let me: any = { id: 'u-lead', firstName: 'Wairimu', role: 'MEMBER' }
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: me }) }))
vi.mock('@/api/board', () => ({ boardApi: { get: vi.fn() } }))
vi.mock('@/api/grounds', () => ({
  groundsApi: { get: vi.fn().mockResolvedValue({ initiatorId: 'u-lead', leadFirstName: 'Rukia' }) },
}))
vi.mock('@/api/today', () => ({ todayApi: { get: vi.fn().mockResolvedValue({ count: 0, line: null, comingUp: [], needs: [] }) } }))
vi.mock('@/components/gw/HowThisHasMoved', () => ({ HowThisHasMoved: () => null }))
vi.mock('@/components/gw/ResolutionPanel', () => ({ ResolutionPanel: () => null }))
vi.mock('@/components/gw/WhatSuccessLooksLike', () => ({ WhatSuccessLooksLikeFor: () => null }))
vi.mock('@/components/gw/TheOtherBoardsYouAreIn', () => ({ TheOtherBoardsYouAreIn: () => null }))
vi.mock('@/api/patterns', () => ({ patternsApi: { answer: vi.fn() } }))

const TARGET = {
  id: 'o-team', name: 'Sales', count: 21, prevCount: 20, target: 25, delta: 1, isNew: false, askedOf: null,
  suggestedCount: null, notSettled: null,
}
const PATTERN_ABOUT_RUKIA = {
  id: 'p1', participantId: 'p-rukia', heading: 'Delivers what was agreed, with proof',
  whatHappened: null, howOften: 'This came up in 3 check-ins.', whoSeesIt: 'You and Rukia Otieno see this.',
  theirWords: null, canAnswer: false, askThem: null, yours: false,
}

const base = {
  groundId: 'g1', renders: true, mode: 'SHARED', family: 'DELIVERY', sections: ['objectives', 'patterns'],
  title: 'Sales team, Q3', scenario: 'OKR_ALIGNMENT', coverageVariant: 'text',
  lastChangedAt: '2026-09-23T15:02:00.000Z',
  objectives: [TARGET],
  patterns: [PATTERN_ABOUT_RUKIA],
  participants: [
    { id: 'p-lead', name: 'Wairimu Kamau', role: null, managingOnly: true, signedOffAt: null },
    { id: 'p-rukia', name: 'Rukia Otieno', role: null, managingOnly: false, signedOffAt: null },
  ],
}
const AS_THE_LEAD = { ...base, myParticipantId: 'p-lead', canEditFrame: true, readOnlyNote: null }
const AS_RUKIA = { ...base, myParticipantId: 'p-rukia', canEditFrame: false, readOnlyNote: null }

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

describe('"What the team is aiming for" says who sets the targets, never "the lead"', () => {
  it('says "You set these targets." to the lead', async () => {
    me = { id: 'u-lead', firstName: 'Wairimu', role: 'MEMBER' }
    renderBoard(AS_THE_LEAD)
    expect(await screen.findByText('You set these targets.')).toBeInTheDocument()
  })

  it('says "{name} sets these targets." to a colleague', async () => {
    me = { id: 'u-rukia', firstName: 'Rukia', role: 'MEMBER' }
    renderBoard(AS_RUKIA)
    expect(await screen.findByText('Rukia sets these targets.')).toBeInTheDocument()
  })
})

describe('"What keeps coming up" names whose private report a judgement stays in', () => {
  it('says "your private report" to the lead', async () => {
    me = { id: 'u-lead', firstName: 'Wairimu', role: 'MEMBER' }
    renderBoard(AS_THE_LEAD)
    expect(await screen.findByText(/stays in your private report and never appears here\./)).toBeInTheDocument()
  })
})
