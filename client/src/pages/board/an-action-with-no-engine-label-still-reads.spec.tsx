import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage } from './BoardPage'
import { boardApi } from '@/api/board'
import { groundsApi } from '@/api/grounds'

/**
 * RELEASE WALKTHROUGH, 5 OCTOBER: TWO LINKS WITH NO TEXT AND NO ACCESSIBLE NAME, BOTH TO
 * `/grounds/<id>?tab=chat`.
 *
 * `AnAction['label']` is typed as a required `string` (api/src/modules/board/
 * what-needs-you-and-what-to-do.ts never returns one empty), but a real board sent it empty for a
 * lead action and a decision's own action - `ActionButtons` (BoardPage.tsx) rendered
 * `<Link>{action.label}</Link>` straight through, so the link held nothing a screen reader could
 * say and nothing on screen to point at. `ActionButtons` now falls back to a plain sentence built
 * from `action.goesTo` whenever the engine's own `label` is empty, the same way it already falls
 * back to "Open" when there is no `action` at all.
 */
let me = { id: 'p-lead', firstName: 'Wanjiru', role: 'MEMBER' }
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: me }) }))
vi.mock('@/api/board', () => ({ boardApi: { get: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn() } }))
vi.mock('@/api/today', () => ({ todayApi: { get: vi.fn().mockResolvedValue({ count: 0, line: null, comingUp: [], needs: [] }) } }))
vi.mock('@/components/gw/ResolutionPanel', () => ({ ResolutionPanel: () => null }))
vi.mock('@/components/gw/WhatSuccessLooksLike', () => ({ WhatSuccessLooksLikeFor: () => null }))
vi.mock('@/components/gw/TheOtherBoardsYouAreIn', () => ({ TheOtherBoardsYouAreIn: () => null }))
vi.mock('@/components/gw/Suggestions', () => ({ SuggestionsForTheLead: () => null }))

const BOARD = {
  groundId: 'g1', renders: true, mode: 'SHARED', family: 'PEOPLE', title: 'Help Baraka get started, test', scenario: 'NEW_HIRE',
  coverageVariant: 'text', lastChangedAt: '2026-09-29T18:02:00.000Z',
  sections: ['leadActions'],
  myParticipantId: 'p-lead', canEditFrame: true, readOnlyNote: null,
  kindOfWork: 'a new hire getting started' as const,
  participants: [
    { id: 'p-lead', name: 'Wanjiru Lead', role: null, managingOnly: true, signedOffAt: null },
    { id: 'p-baraka', name: 'Baraka Mwangi', role: null, managingOnly: false, signedOffAt: null },
  ],
  // The engine's own `label` sent empty - the real-world shape this test exists to catch.
  leadActions: [
    { id: 'la1', says: 'Baraka Mwangi has not said how their first week went.', because: null, action: { label: '', goesTo: 'check-in' } },
  ],
}

const GROUND = {
  initiatorId: 'p-lead', leadFirstName: 'Wanjiru', timelineDays: 90, cadence: 'WEEKLY',
  participants: [
    { id: 'p-lead', managingOnly: true },
    { id: 'p-baraka', managingOnly: false },
  ],
  checkIns: [],
  roundCompletions: [],
}

function renderBoard() {
  (boardApi.get as any).mockResolvedValue(BOARD);
  (groundsApi.get as any).mockResolvedValue(GROUND)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds/g1/board']}>
        <Routes><Route path="/grounds/:id/board" element={<BoardPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('an action with no engine label still reads as something', () => {
  it('the lead action\'s own link to the check-in tab carries words, not silence', async () => {
    renderBoard()
    await screen.findByRole('heading', { name: 'Help Baraka get started, test' })
    const links = Array.from(document.querySelectorAll('a[href*="tab=chat"]')) as HTMLAnchorElement[]
    expect(links.length).toBeGreaterThan(0)
    for (const link of links) {
      expect((link.textContent ?? '').trim()).not.toBe('')
    }
  })
})
