import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage } from './BoardPage'
import { boardApi } from '@/api/board'
vi.mock('@/api/patterns', () => ({ patternsApi: { answer: vi.fn() } }))

/**
 * REQUEST FOR THE SCREENS WORKSPACE (4 October 2026): THE KIND-OF-WORK DIALOG LISTS ONLY
 * `kindsOffered`, PLUS THE KIND THE CHECK-IN ALREADY HOLDS.
 *
 * The release offers a new check-in only some of the eleven kinds (at release, only "sales org").
 * The board now carries `kindsOffered`; the server refuses the rest with a plain sentence. The
 * dialog in WorkRecords.tsx (`KindOfWorkBanner`) should list only `kindsOffered`, plus `kindOfWork`
 * itself, so a check-in that already holds another kind can still be saved. Absent `kindsOffered`
 * (an older server) keeps today's full list.
 */
const me = { id: 'u-wairimu', firstName: 'Wairimu', role: 'MEMBER' }
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: me }) }))
vi.mock('@/api/board', () => ({
  boardApi: { get: vi.fn() },
  KIND_OF_WORK_OPTIONS: [
    'sales org', 'engineering release', 'support desk', 'distribution operations',
    'trader training programme', "founder's own check-in", 'asset loans',
    'MarketView where next', 'MarketView Q4', 'a law firm matter', 'a government programme',
  ],
}))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn().mockResolvedValue({ initiatorId: 'u-wairimu', organizationId: 'org-1', leadFirstName: 'Wairimu' }), setKindOfWork: vi.fn() } }))
vi.mock('@/api/today', () => ({ todayApi: { get: vi.fn().mockResolvedValue({ count: 0, line: null, comingUp: [], needs: [] }) } }))
vi.mock('@/components/gw/HowThisHasMoved', () => ({ HowThisHasMoved: () => null }))
vi.mock('@/components/gw/ResolutionPanel', () => ({ ResolutionPanel: () => null }))
vi.mock('@/components/gw/WhatSuccessLooksLike', () => ({ WhatSuccessLooksLikeFor: () => null }))
vi.mock('@/components/gw/TheOtherBoardsYouAreIn', () => ({ TheOtherBoardsYouAreIn: () => null }))

const base = {
  groundId: 'g1', renders: true, mode: 'SHARED', family: 'DELIVERY', sections: [],
  title: 'A check-in', scenario: 'OKR_ALIGNMENT', coverageVariant: 'text',
  lastChangedAt: '2026-09-23T15:02:00.000Z',
  participants: [
    { id: 'p-lead', name: 'Wairimu Kamau', role: null, managingOnly: true, signedOffAt: null },
  ],
  myParticipantId: 'p-lead', canEditFrame: true, readOnlyNote: null,
  workRecords: [],
}

function renderBoard(payload: any, at = '/grounds/g1/board') {
  ;(boardApi.get as any).mockResolvedValue(payload)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[at]}>
        <Routes><Route path="/grounds/:id/board" element={<BoardPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => vi.clearAllMocks())

describe('the kind-of-work dialog, scoped to kindsOffered', () => {
  it('lists only the offered kind when the check-in has no kind yet', async () => {
    renderBoard({ ...base, kindOfWork: null, kindsOffered: ['sales org'] })
    await screen.findByText('Nobody has said what kind of work this check-in is about yet. Choose one, so its board can keep the right kind of record.')
    await userEvent.click(await screen.findByRole('button', { name: 'Choose the kind of work' }))
    const select = screen.getByLabelText('Kind of work') as HTMLSelectElement
    const labels = Array.from(select.options).map((o) => o.textContent)
    expect(labels).toContain('A sales team and its deals')
    expect(labels).not.toContain('A law firm matter')
    expect(labels).not.toContain("A founder's own check-in, about their own commitments and decisions")
  })

  /* Screen match, 16 October: a law firm matter's lead first reads matter-board.jpg's own board, which has neither; both hold, unchanged, on "See every other part of this board" (?whole=1). */
  it('still lists the check-in’s own kind even when it is not offered, so it can still be saved', async () => {
    renderBoard({ ...base, kindOfWork: 'a law firm matter', kindsOffered: ['sales org'] }, '/grounds/g1/board?whole=1')
    await userEvent.click(await screen.findByRole('button', { name: 'Change the kind of work' }))
    const select = screen.getByLabelText('Kind of work') as HTMLSelectElement
    const labels = Array.from(select.options).map((o) => o.textContent)
    expect(labels).toContain('A law firm matter')
    expect(labels).toContain('A sales team and its deals')
    expect(labels).not.toContain("A founder's own check-in, about their own commitments and decisions")
  })

  it('keeps today’s full list when the server sends no kindsOffered at all', async () => {
    renderBoard({ ...base, kindOfWork: null })
    await userEvent.click(await screen.findByRole('button', { name: 'Choose the kind of work' }))
    const select = screen.getByLabelText('Kind of work') as HTMLSelectElement
    const labels = Array.from(select.options).map((o) => o.textContent)
    expect(labels).toContain('A law firm matter')
    expect(labels).toContain('A sales team and its deals')
  })
})
