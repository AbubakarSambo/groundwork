import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage } from './BoardPage'
import { boardApi } from '@/api/board'

/**
 * DECISION 141 (3), 12 October 2026: "The coverage bar as a percentage beside a person's name: bring it
 * back for the lead, as the prototype shows. Never sort or rank people by it."
 *
 * The lead reads each person's percentage beside their name, and a sentence saying what it is, with the
 * people in the order the server sent them (not by the percentage). A participant reads no such section.
 */
let me = { id: 'u-lead', firstName: 'Wairimu', role: 'MEMBER' }
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: me }) }))
vi.mock('@/api/board', () => ({ boardApi: { get: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn().mockResolvedValue({ initiatorId: 'u-lead' }) } }))
vi.mock('@/api/today', () => ({ todayApi: { get: vi.fn().mockResolvedValue({ count: 0, line: null, comingUp: [], needs: [] }) } }))
vi.mock('@/components/gw/HowThisHasMoved', () => ({ HowThisHasMoved: () => null }))
vi.mock('@/components/gw/ResolutionPanel', () => ({ ResolutionPanel: () => null }))
vi.mock('@/components/gw/WhatSuccessLooksLike', () => ({ WhatSuccessLooksLikeFor: () => null }))
vi.mock('@/components/gw/TheOtherBoardsYouAreIn', () => ({ TheOtherBoardsYouAreIn: () => null }))

const aRead = (participantId: string, name: string, landingPercent: number | undefined) => ({
  participantId, name, scope: 'role', kind: 'STABLE', trend: 'stable',
  what: null, reason: '', reasonText: null, ownVoice: null, coupledToBlocker: false, remitDefined: true, shown: true,
  ...(landingPercent === undefined ? {} : { landingPercent }),
})

const board = (myParticipantId: string, percents: boolean) => ({
  groundId: 'g1', renders: true, mode: 'SHARED', family: 'DELIVERY', title: 'Sales team, Q3', scenario: 'OKR_ALIGNMENT',
  coverageVariant: 'bar', lastChangedAt: '2026-09-23T15:02:00.000Z',
  sections: ['coverage'],
  myParticipantId, canEditFrame: false, readOnlyNote: null,
  participants: [
    { id: 'p-lead', name: 'Wairimu Kamau', role: null, managingOnly: true, signedOffAt: null },
    { id: 'p-rukia', name: 'Rukia Otieno', role: null, managingOnly: false, signedOffAt: null },
    { id: 'p-brian', name: 'Brian Mwangi', role: null, managingOnly: false, signedOffAt: null },
    { id: 'p-amani', name: 'Amani Njeri', role: null, managingOnly: false, signedOffAt: null },
  ],
  coverage: {
    scope: 'role',
    reads: [
      aRead('p-rukia', 'Rukia Otieno', percents ? 10 : undefined),
      aRead('p-brian', 'Brian Mwangi', percents ? 70 : undefined),
      aRead('p-amani', 'Amani Njeri', percents ? 30 : undefined),
    ],
  },
})

function renderBoard() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds/g1/board']}>
        <Routes><Route path="/grounds/:id/board" element={<BoardPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => { me = { id: 'u-lead', firstName: 'Wairimu', role: 'MEMBER' } })

describe('the coverage percentage beside a person, as the lead reads it', () => {
  it('shows each percentage beside the name, says what it is, and keeps the people in the order served', async () => {
    ;(boardApi.get as any).mockResolvedValue(board('p-lead', true))
    const { container } = renderBoard()
    await screen.findByText('Where work is landing')
    expect([...container.querySelectorAll('[data-testid="coverage-percent"]')].map((n) => n.textContent)).toEqual(['10%', '70%', '30%'])
    expect([...container.querySelectorAll('[data-testid="coverage-percent-says"]')].map((n) => n.textContent)).toEqual([
      '10% of Rukia Otieno’s work is on other people’s tasks.',
      '70% of Brian Mwangi’s work is on other people’s tasks.',
      '30% of Amani Njeri’s work is on other people’s tasks.',
    ])
    const text = container.textContent ?? ''
    expect(text.indexOf('Rukia Otieno')).toBeLessThan(text.indexOf('Brian Mwangi'))
    expect(text.indexOf('Brian Mwangi')).toBeLessThan(text.indexOf('Amani Njeri'))
    expect(container.querySelectorAll('[data-testid="coverage-bar-fill"]')).toHaveLength(3)
  })
})

describe('a participant', () => {
  it('reads no percentage and no section about where colleagues’ work is landing', async () => {
    me = { id: 'u-rukia', firstName: 'Rukia', role: 'MEMBER' }
    ;(boardApi.get as any).mockResolvedValue(board('p-rukia', false))
    const { container } = renderBoard()
    await screen.findAllByText('Sales team, Q3')
    expect(screen.queryByText('Where work is landing')).toBeNull()
    expect(container.querySelector('[data-testid="coverage-percent"]')).toBeNull()
    expect(container.textContent).not.toMatch(/\d+%/)
  })
})
