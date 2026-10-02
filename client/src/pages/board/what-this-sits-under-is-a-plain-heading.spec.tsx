import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage } from './BoardPage'
import { boardApi } from '@/api/board'

/**
 * SECOND BOARD REVIEW, WORDING: THE HEADING OVER "WHAT THIS SITS UNDER" IS PLAIN, EITHER WAY.
 *
 * `b.cascade.isCascade` used to pick between two headings - "What this sits under" when something
 * was named above the objectives, "Nothing above this" when nothing was. The second is a label, not
 * a sentence a reader can picture anything from; the section is always about the same one thing,
 * whichever answer it has, and the "nothing named yet" answer is already said in full by
 * `b.cascade.why`. Both cases now draw the one heading.
 */
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: { id: 'u-lead', firstName: 'Wairimu', role: 'MEMBER' } }) }))
vi.mock('@/api/board', () => ({ boardApi: { get: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn().mockResolvedValue({ initiatorId: 'u-lead' }) } }))
vi.mock('@/api/today', () => ({ todayApi: { get: vi.fn().mockResolvedValue({ count: 0, line: null, comingUp: [], needs: [] }) } }))
vi.mock('@/components/gw/HowThisHasMoved', () => ({ HowThisHasMoved: () => null }))
vi.mock('@/components/gw/ResolutionPanel', () => ({ ResolutionPanel: () => null }))
vi.mock('@/components/gw/WhatSuccessLooksLike', () => ({ WhatSuccessLooksLikeFor: () => null }))
vi.mock('@/components/gw/TheOtherBoardsYouAreIn', () => ({ TheOtherBoardsYouAreIn: () => null }))

const base = {
  groundId: 'g1', renders: true, mode: 'SHARED', family: 'DELIVERY', sections: ['cascade'],
  title: 'Sales team, Q3', scenario: 'NOT_A_REAL_SCENARIO', coverageVariant: 'text',
  lastChangedAt: '2026-09-23T15:02:00.000Z',
  participants: [{ id: 'p-lead', name: 'Wairimu Kamau', role: null, managingOnly: true, signedOffAt: null }],
  myParticipantId: 'p-lead', canEditFrame: true, readOnlyNote: null,
}

function renderBoard(cascade: any) {
  ;(boardApi.get as any).mockResolvedValue({ ...base, cascade })
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds/g1/board']}>
        <Routes><Route path="/grounds/:id/board" element={<BoardPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('"What this sits under" is a plain heading, whichever answer the record has', () => {
  it('says so when something is named above', async () => {
    renderBoard({
      isCascade: true, basis: ['DECLARED'], parentNamed: 'doubling active shops', teamsNamed: [],
      why: 'The objectives here are held as part of doubling active shops. What is shown below is whether the parts add up to it, not how any team is doing.',
    })
    await screen.findByRole('heading', { name: 'Sales team, Q3' })
    expect(screen.getByText('What this sits under')).toBeTruthy()
    expect(screen.getByText('doubling active shops')).toBeTruthy()
    expect(screen.queryByText('Nothing above this')).toBeNull()
  })

  it('says the same heading when nothing is named above, and the sentence says so', async () => {
    renderBoard({
      isCascade: false, basis: ['DECLARED'], parentNamed: null, teamsNamed: [],
      why: 'Nothing above this has been named yet. The objectives here are being held on their own, so there is nothing to check them against. If they are meant to serve something wider, saying what it is makes that checkable.',
    })
    await screen.findByRole('heading', { name: 'Sales team, Q3' })
    expect(screen.getByText('What this sits under')).toBeTruthy()
    expect(screen.queryByText('Nothing above this')).toBeNull()
    expect(screen.getByText(/Nothing above this has been named yet/)).toBeTruthy()
  })
})
