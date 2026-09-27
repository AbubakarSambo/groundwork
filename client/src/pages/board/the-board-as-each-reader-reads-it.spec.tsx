import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage } from './BoardPage'
import { boardApi } from '@/api/board'

/**
 * U.10: THE BOARD, AS THE LEAD, A PARTICIPANT AND AN ADMIN READ IT.
 *
 * Each payload is what the server serves that reader (see the API's
 * the-board-as-each-reader-reads-it.spec.ts): the admin gets the read-only note, Miriam gets only
 * the targets she may read, and no row ever carries the rating of how checkable someone's answers
 * were. This reads the rendered page, not the code.
 */
let me = { id: 'u-wairimu', firstName: 'Wairimu', role: 'MEMBER' }
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: me }) }))
vi.mock('@/api/board', () => ({ boardApi: { get: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn().mockResolvedValue({ initiatorId: 'u-wairimu' }) } }))
vi.mock('@/components/gw/HowThisHasMoved', () => ({ HowThisHasMoved: () => null }))
vi.mock('@/components/gw/ResolutionPanel', () => ({ ResolutionPanel: () => null }))
vi.mock('@/components/gw/WhatSuccessLooksLike', () => ({ WhatSuccessLooksLikeFor: () => null }))
vi.mock('@/components/gw/TheOtherBoardsYouAreIn', () => ({ TheOtherBoardsYouAreIn: () => null }))

const TEAM_TARGET = {
  id: 'o-team', name: 'Sales', count: 21, prevCount: 20, target: 25, delta: 1, isNew: false, askedOf: null,
  suggestedCount: null, notSettled: null,
  assumes: ['6 reps each close about 4 sales.', 'Stock arrives within a week of an order.'],
}
const AISHAS = {
  id: 'o-aisha', name: 'Aisha’s sales', count: 4, prevCount: 4, target: 5, delta: 0, isNew: false, askedOf: null,
  suggestedCount: null, notSettled: null, owner: 'Aisha Otieno', assumes: ['Aisha keeps her two supermarket buyers.'],
}

const base = {
  groundId: 'g1', renders: true, mode: 'SHARED', family: 'DELIVERY', sections: ['objectives'],
  title: 'Sales team, Q3', scenario: 'OKR_ALIGNMENT', coverageVariant: 'text',
  lastChangedAt: '2026-09-23T15:02:00.000Z',
  participants: [
    { id: 'p-lead', name: 'Wairimu Kamau', role: null, managingOnly: true, signedOffAt: null },
    { id: 'p-miriam', name: 'Miriam Wanjiku', role: null, managingOnly: false, signedOffAt: null },
    { id: 'p-aisha', name: 'Aisha Otieno', role: null, managingOnly: false, signedOffAt: null },
  ],
}

const AS_THE_LEAD = {
  ...base, myParticipantId: 'p-lead', canEditFrame: true, readOnlyNote: null,
  objectives: [TEAM_TARGET, AISHAS],
  eachPerson: [
    { participantId: 'p-aisha', who: 'Aisha Otieno', target: 5, count: 4, reason: 'nothing to do', ask: null },
    { participantId: 'p-miriam', who: 'Miriam Wanjiku', target: null, count: 0, reason: 'nothing to do', ask: null },
  ],
}
const AS_MIRIAM = { ...base, myParticipantId: 'p-miriam', canEditFrame: false, readOnlyNote: null, objectives: [TEAM_TARGET] }
const AS_AN_ADMIN = {
  ...base, myParticipantId: null, canEditFrame: false,
  readOnlyNote: 'You can read this check-in’s board and reports. Wairimu Kamau runs it.',
  objectives: [TEAM_TARGET, AISHAS],
}

const LAST_UPDATED = /^Last updated on Wednesday 23 September at \d{1,2}(:\d\d)?(am|pm)\. The board only changes when something new comes in, such as a check-in, a report, a decision or a number from another system\.$/

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

describe('the board, as each reader reads it', () => {
  beforeEach(() => vi.clearAllMocks())

  it('Wairimu, who runs it, reads when it last changed, and what each target assumes', async () => {
    me = { id: 'u-wairimu', firstName: 'Wairimu', role: 'MEMBER' }
    renderBoard(AS_THE_LEAD)
    expect(await screen.findByText(LAST_UPDATED)).toBeTruthy()
    expect(screen.getByText('What the target of 25 assumes')).toBeTruthy()
    expect(screen.getByText('6 reps each close about 4 sales.')).toBeTruthy()
    expect(screen.getByText('What the target of 5 assumes')).toBeTruthy()
    expect(screen.getAllByText('If one of these stops being true, the target needs a second look.')).toHaveLength(2)
    expect(screen.queryByText(/You can read this check-in’s board and reports/)).toBeNull()
    /* No rating of anybody's answers, in any words. */
    expect(document.body.textContent).not.toMatch(/checkable|specific|vague/i)
    /* And the old footer, which was not true, is gone. */
    expect(document.body.textContent).not.toMatch(/sees the same board|regenerates|Only the meeting poll/)
  })

  it('Miriam reads the same line, the team target and what it assumes, and nothing about Aisha’s number', async () => {
    me = { id: 'u-miriam', firstName: 'Miriam', role: 'MEMBER' }
    renderBoard(AS_MIRIAM)
    expect(await screen.findByText(LAST_UPDATED)).toBeTruthy()
    expect(screen.getByText('What the target of 25 assumes')).toBeTruthy()
    expect(screen.queryByText(/supermarket buyers/)).toBeNull()
    expect(screen.queryByText(/You can read this check-in’s board and reports/)).toBeNull()
  })

  it('Grace, an admin who only reads, is told who runs it', async () => {
    me = { id: 'u-grace', firstName: 'Grace', role: 'ADMIN' }
    renderBoard(AS_AN_ADMIN)
    expect(await screen.findByText(LAST_UPDATED)).toBeTruthy()
    expect(screen.getByText('You can read this check-in’s board and reports. Wairimu Kamau runs it.')).toBeTruthy()
    /* She reads; she is offered nothing to change. */
    expect(screen.queryByText('Add target')).toBeNull()
  })

  it('with no time on record yet, it still says the board only changes when something new comes in', async () => {
    me = { id: 'u-wairimu', firstName: 'Wairimu', role: 'MEMBER' }
    renderBoard({ ...AS_THE_LEAD, lastChangedAt: null })
    expect(await screen.findByText('The board only changes when something new comes in, such as a check-in, a report, a decision or a number from another system.')).toBeTruthy()
  })
})
