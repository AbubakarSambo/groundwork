import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage } from './BoardPage'
import { boardApi } from '@/api/board'
import { tileSentence } from '@/components/gw/TheSessionsReport'

/**
 * U.10 RE-REVIEW, FOURTH ROUND: ITEMS 3 TO 6, WALKED LIVE AS JUMA ON A REAL BOARD.
 *
 * Renders the board with real shapes for the objectives row, the phase spine, dependencies and
 * quick-read tiles, and checks each fix reads as the sentence asked for.
 */
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: { id: 'u-lead', firstName: 'Wairimu', role: 'MEMBER' } }) }))
vi.mock('@/api/board', () => ({ boardApi: { get: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn().mockResolvedValue({ initiatorId: 'u-lead', timelineDays: 90, cadence: 'WEEKLY' }) } }))
vi.mock('@/api/today', () => ({ todayApi: { get: vi.fn().mockResolvedValue({ count: 0, line: null, comingUp: [], needs: [] }) } }))
vi.mock('@/components/gw/HowThisHasMoved', () => ({ HowThisHasMoved: () => null }))
vi.mock('@/components/gw/ResolutionPanel', () => ({ ResolutionPanel: () => null }))
vi.mock('@/components/gw/WhatSuccessLooksLike', () => ({ WhatSuccessLooksLikeFor: () => null }))
vi.mock('@/components/gw/TheOtherBoardsYouAreIn', () => ({ TheOtherBoardsYouAreIn: () => null }))

const BOARD = {
  groundId: 'g1', renders: true, mode: 'SHARED', family: 'DELIVERY', title: 'Sales team, Q3', scenario: 'OKR_ALIGNMENT',
  coverageVariant: 'text', lastChangedAt: '2026-09-23T15:02:00.000Z',
  sections: ['objectives', 'dependencies', 'quickRead', 'checkInGrid', 'phaseSpine'],
  myParticipantId: 'p-lead', canEditFrame: true, readOnlyNote: null,
  participants: [
    { id: 'p-lead', name: 'Wairimu Kamau', role: null, managingOnly: true, signedOffAt: null },
    { id: 'p-rukia', name: 'Rukia Otieno', role: null, managingOnly: false, signedOffAt: null },
  ],
  objectives: [{
    id: 'o-team', name: 'Sales', count: 12, prevCount: 0, target: 12, delta: 12, isNew: false, askedOf: null,
    suggestedCount: null, notSettled: null,
    journey: { direction: 'up' as const, start: 0, now: 12, target: 12, say: '', covered: 100 },
  }],
  dependencies: [{
    id: 'd1', from: 'Baraka Mwangi', what: 'the discount decision', on: 'Rukia Otieno',
    status: 'BLOCKING', then: null,
  }],
  quickRead: [
    { label: 'Differences', value: 'None', sub: 'no disagreement, as the written report reads it', tone: 'good' },
  ],
  phaseSpine: {
    startsAt: '2026-09-01T00:00:00.000Z', endsAt: null, currentSession: 2,
    sessions: [
      { n: 1, state: 'done', date: '2026-09-27T10:00:00.000Z', opensOn: null },
      { n: 2, state: 'upcoming', date: null, opensOn: null },
    ],
  },
}

function renderBoard() {
  ;(boardApi.get as any).mockResolvedValue(BOARD)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds/g1/board']}>
        <Routes><Route path="/grounds/:id/board" element={<BoardPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('U.10 re-review round 4', () => {
  it('item 3: the objective row reads as two sentences', async () => {
    renderBoard()
    await screen.findByRole('heading', { name: 'Sales team, Q3' })
    expect(screen.getByText('now, up from 0. The aim is 12.', { exact: false })).toBeTruthy()
    expect(screen.getByText('Up 12 this check-in.')).toBeTruthy()
  })

  it('item 4: the session strip says what is true, never "today" for a round that only opened days ago', async () => {
    renderBoard()
    await screen.findByRole('heading', { name: 'Sales team, Q3' })
    /* Board review, 30 September, item 9 (second pass): "27 Sept." beside "Tuesday 29 September"
       elsewhere on the same board was two date forms for one page - now the same long form. */
    expect(screen.getByText('Check-in 1 opened on 27 September.')).toBeTruthy()
    expect(screen.getByText('Check-in 2 has not opened yet.')).toBeTruthy()
    expect(screen.queryByText(/is today/)).toBeNull()
  })

  it('item 5: a "waiting on" row reads as one sentence, not labelled pieces', async () => {
    renderBoard()
    expect(await screen.findByText(/needs the discount decision from/)).toBeTruthy()
    expect(screen.getByText('This is blocking work.', { exact: false })).toBeTruthy()
    expect(screen.queryByText('needs', { selector: 'span' })).toBeNull()
  })

  it('item 6: a quick-read tile reads as tileSentence composes it, not a label/value/sub stack', async () => {
    renderBoard()
    const expected = tileSentence(BOARD.quickRead[0] as any)
    expect(await screen.findByText(expected)).toBeTruthy()
    expect(screen.queryByText('None')).toBeNull()
    expect(screen.queryByText('no disagreement, as the written report reads it')).toBeNull()
  })
})
