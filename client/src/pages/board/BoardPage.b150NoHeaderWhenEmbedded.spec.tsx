import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage } from './BoardPage'
import { boardApi } from '@/api/board'

/**
 * B-150. Team boards (`/boards`) passes `groundId` to this component directly, so it can draw its
 * own tab strip above the board without a second one underneath. `trailing` already stopped
 * drawing the header's own inner board-switcher in that case (`!groundId`), but the breadcrumb,
 * the serif title, "Your check-in"/"Start my check-in", "Ask" and the full six-tab bar were not
 * gated at all - so a reader on /boards got the whole check-in header and tab bar a second time,
 * under the one /boards itself already draws. The header now only renders on the board's own
 * route (`/grounds/:id/board`, where `id` comes from the URL), not when a caller supplies the
 * ground directly. Payload shape copied from the-board-as-each-reader-reads-it.spec.tsx's own
 * `AS_MIRIAM` fixture, which is proven to reach the full header and tab bar.
 */
vi.mock('@/stores/auth', () => ({
  useAuthStore: (sel: any) => sel({ user: { id: 'u-wairimu', firstName: 'Wairimu', role: 'MEMBER' } }),
}))
vi.mock('@/api/board', () => ({ boardApi: { get: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn().mockResolvedValue({ initiatorId: 'u-wairimu' }) } }))
vi.mock('@/api/today', () => ({ todayApi: { get: vi.fn().mockResolvedValue({ count: 0, line: null, comingUp: [], needs: [] }) } }))
vi.mock('@/components/gw/HowThisHasMoved', () => ({ HowThisHasMoved: () => null }))
vi.mock('@/components/gw/ResolutionPanel', () => ({ ResolutionPanel: () => null }))
vi.mock('@/components/gw/WhatSuccessLooksLike', () => ({ WhatSuccessLooksLikeFor: () => null }))
vi.mock('@/components/gw/TheOtherBoardsYouAreIn', () => ({ TheOtherBoardsYouAreIn: () => null }))

const TEAM_TARGET = {
  id: 'o-team', name: 'Sales', count: 21, prevCount: 20, target: 25, delta: 1, isNew: false, askedOf: null,
  suggestedCount: null, notSettled: null,
  assumes: ['6 reps each close about 4 sales.'],
}
const PAYLOAD = {
  groundId: 'g1', renders: true, mode: 'SHARED', family: 'DELIVERY', sections: ['objectives'],
  title: 'Weekly sales push, Nairobi', scenario: 'OKR_ALIGNMENT', coverageVariant: 'text',
  lastChangedAt: '2026-09-23T15:02:00.000Z',
  participants: [
    { id: 'p-wairimu', name: 'Wairimu Kamau', role: null, managingOnly: false, signedOffAt: null },
  ],
  myParticipantId: 'p-wairimu', canEditFrame: false, readOnlyNote: null,
  objectives: [TEAM_TARGET],
}

beforeEach(() => vi.clearAllMocks())

describe('B-150: the check-in header draws once, never twice', () => {
  it('on its own route (/grounds/:id/board), the header and tabs are drawn', async () => {
    ;(boardApi.get as any).mockResolvedValue(PAYLOAD)
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/grounds/g1/board']}>
          <Routes><Route path="/grounds/:id/board" element={<BoardPage />} /></Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(await screen.findByRole('tab', { name: 'Board' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Check-ins' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'People and setup' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Weekly sales push, Nairobi' })).toBeTruthy()
  })

  it('embedded on /boards (a ground id passed directly), no breadcrumb and no six-tab bar', async () => {
    ;(boardApi.get as any).mockResolvedValue(PAYLOAD)
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/boards']}>
          <BoardPage groundId="g1" />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(await screen.findByText('Sales', { selector: 'strong, b, span, div, p' })).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Check-ins' })).toBeNull()
    expect(screen.queryByRole('tab', { name: 'People and setup' })).toBeNull()
    expect(screen.queryByRole('tab', { name: 'Context and resources' })).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Weekly sales push, Nairobi' })).toBeNull()
  })
})
