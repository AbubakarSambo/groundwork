import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage } from './BoardPage'
import { boardApi } from '@/api/board'

/**
 * RE-REVIEW: "0 NOW, UP FROM 0." IS NOT A MOVE.
 *
 * Read live on "You are aiming for 4 shops." (a target nothing has been counted against yet,
 * `journey.start` and `o.count` both 0): the row read "0 now, up from 0. The aim is 4.", claiming
 * a rise that never happened, for both the lead and anybody else who reads this target. "Up"/
 * "down from" is only true once the count has actually moved from where it started; unmoved reads
 * the same plain "X of Y." the row already uses when there is no start to compare against at all.
 */
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: { id: 'u-rukia', firstName: 'Rukia', role: 'MEMBER' } }) }))
vi.mock('@/api/board', () => ({ boardApi: { get: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn().mockResolvedValue({ initiatorId: 'u-rukia' }) } }))
vi.mock('@/api/today', () => ({ todayApi: { get: vi.fn().mockResolvedValue({ count: 0, line: null, comingUp: [], needs: [] }) } }))
vi.mock('@/components/gw/HowThisHasMoved', () => ({ HowThisHasMoved: () => null }))
vi.mock('@/components/gw/ResolutionPanel', () => ({ ResolutionPanel: () => null }))
vi.mock('@/components/gw/WhatSuccessLooksLike', () => ({ WhatSuccessLooksLikeFor: () => null }))
vi.mock('@/components/gw/TheOtherBoardsYouAreIn', () => ({ TheOtherBoardsYouAreIn: () => null }))

const board = (objective: any) => ({
  groundId: 'g1', renders: true, mode: 'SHARED', family: 'DELIVERY', title: 'Sales team, Q3', scenario: 'OKR_ALIGNMENT',
  coverageVariant: 'text', lastChangedAt: '2026-09-23T15:02:00.000Z',
  sections: ['objectives'], myParticipantId: 'p-rukia', canEditFrame: true, readOnlyNote: null,
  participants: [
    { id: 'p-rukia', name: 'Rukia Otieno', role: null, managingOnly: false, signedOffAt: null },
  ],
  objectives: [objective],
})

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

describe('the objective row: "up"/"down from" only when the count has actually moved', () => {
  it('reads "0 of 4." when the count has not moved from its start, never "up from 0"', async () => {
    renderBoard(board({
      id: 'o-rukia', name: 'You are aiming for 4 shops.', count: 0, prevCount: 0, target: 4, delta: 0, isNew: false, askedOf: null,
      suggestedCount: null, notSettled: null, ownerParticipantId: 'p-rukia',
      journey: { direction: 'unknown' as const, start: 0, now: 0, target: 4, say: '', covered: null },
    }))
    await screen.findByRole('heading', { name: 'Sales team, Q3' })
    expect(screen.getByText('of 4.', { exact: false })).toBeTruthy()
    expect(screen.queryByText(/up from/)).toBeNull()
    expect(screen.queryByText(/down from/)).toBeNull()
  })

  it('reads "up from" when the count has risen from its start', async () => {
    renderBoard(board({
      id: 'o-team', name: 'Sign 12 shops', count: 5, prevCount: 0, target: 12, delta: 5, isNew: false, askedOf: null,
      suggestedCount: null, notSettled: null,
      journey: { direction: 'up' as const, start: 0, now: 5, target: 12, say: '', covered: 42 },
    }))
    await screen.findByRole('heading', { name: 'Sales team, Q3' })
    expect(screen.getByText('now, up from 0. The aim is 12.', { exact: false })).toBeTruthy()
    expect(screen.queryByText(/down from/)).toBeNull()
  })

  it('reads "down from" when the count has fallen from its start', async () => {
    renderBoard(board({
      id: 'o-team', name: 'Keep response time under four hours', count: 3, prevCount: 6, target: 2, delta: -3, isNew: false, askedOf: null,
      suggestedCount: null, notSettled: null,
      journey: { direction: 'down' as const, start: 6, now: 3, target: 2, say: '', covered: 50 },
    }))
    await screen.findByRole('heading', { name: 'Sales team, Q3' })
    expect(screen.getByText('now, down from 6. The aim is 2.', { exact: false })).toBeTruthy()
    expect(screen.queryByText(/up from/)).toBeNull()
  })
})
