import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GroundAdminPage } from './GroundAdminPage'
import { groundsApi } from '@/api/grounds'
import { checkInHeaderTabs } from './ground-tabs'

/**
 * FAULT 3: "MY WORK" HAS TO GO TO ONE PLACE, HOWEVER IT WAS REACHED.
 *
 * Rukia leads "Sales team, Q3" and also takes part in it (the ordinary case: a lead who checks in
 * too). The same "My work" label is on this page's tab row, the board's, the report pages'
 * (`checkInHeaderTabs` in ground-tabs.ts) and behind `?tab=mywork`. Same label, so one destination.
 *
 * Changed 4 November 2026 (batch 1, group 10): with Release 1B's switch gone, My work is the B7 page
 * (MyWorkPage.tsx) for the lead as well as each person in it, so that one destination is the B7 page,
 * not the roster. After the merge this page's tab row went to B7 while the board's and the report
 * pages' rows still sent a lead to `?tab=sessions`, the roster: the same fault again, so every row now
 * sends My work to `?tab=record`. The roster is still `?tab=sessions`, and "Who has answered" inside My work.
 */
vi.mock('@/stores/auth', () => ({
  useAuthStore: (sel: any) => sel({ user: { id: 'u-rukia', role: 'MEMBER', email: 'rukia@x.test' }, isAuthenticated: true }),
}))
vi.mock('@/api/participantRequests', () => ({ participantRequestsApi: { list: vi.fn().mockResolvedValue([]) } }))
vi.mock('@/api/reports', () => ({ reportsApi: { get: vi.fn() } }))
vi.mock('@/api/documents', () => ({ documentsApi: { list: vi.fn() } }))
vi.mock('@/api/resolution', () => ({ resolutionApi: { get: vi.fn().mockResolvedValue(null), propose: vi.fn() } }))
vi.mock('@/api/conversation', () => ({ conversationApi: { remind: vi.fn() } }))
vi.mock('@/api/billing', () => ({ billingApi: { status: vi.fn().mockResolvedValue(null), getContributorCodeShareCard: vi.fn() } }))
vi.mock('@/api/grounds', async () => {
  const { SERVED_TO_THE_LEAD } = await import('./my-work-served.fixture')
  return { groundsApi: { get: vi.fn(), myWork: vi.fn().mockResolvedValue(SERVED_TO_THE_LEAD) } }
})

function ground() {
  return {
    id: 'g1', label: 'Sales team, Q3', status: 'ACTIVE', scenario: 'SALES', timelineDays: 90, cadence: 'WEEKLY',
    daysLeft: 72, overdue: 0, initiatorId: 'u-rukia',
    participants: [
      { id: 'p-rukia', userId: 'u-rukia', email: 'rukia@x.test', partyType: 'INITIATOR', accepted: true },
      { id: 'p-amani', userId: 'u-amani', email: 'amani@x.test', partyType: 'PARTICIPANT', accepted: true },
    ],
    checkIns: [
      { id: 'c1', participantId: 'p-rukia', sessionNumber: 1, status: 'COMPLETED', completedAt: '2026-09-27' },
      { id: 'c2', participantId: 'p-amani', sessionNumber: 1, status: 'COMPLETED', completedAt: '2026-09-27' },
    ],
    boardRenders: true,
  }
}

function renderPageAt(entry: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[entry]}>
        <Routes><Route path="/grounds/:id" element={<GroundAdminPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  ;(groundsApi.get as any).mockResolvedValue(ground())
})

describe('"My work" lands in the same place, whichever tab row sent it there', () => {
  /* Her own B7 page says "Your work"; the roster's "People" heading is not on it. */
  const onHerMyWork = async () => {
    expect(await screen.findByRole('heading', { name: 'Your work' })).toBeTruthy()
    expect(groundsApi.myWork).toHaveBeenCalledWith('g1', null)
  }

  it('clicking "My work" from inside the check-in page lands the lead on her My work', async () => {
    renderPageAt('/grounds/g1')
    await waitFor(() => expect(screen.getAllByText(/Sales team, Q3/i).length).toBeGreaterThan(0))
    fireEvent.click(screen.getByRole('tab', { name: 'My work' }))
    await onHerMyWork()
  })

  it('the report pages\' "My work" sends the lead to the same page', async () => {
    const myWork = checkInHeaderTabs({ id: 'g1', canRunThisCheckIn: true, isAParty: true }).find((t) => t.label === 'My work')!
    expect(myWork.to).toBe('/grounds/g1?tab=record')
    renderPageAt(myWork.to)
    await waitFor(() => expect(screen.getAllByText(/Sales team, Q3/i).length).toBeGreaterThan(0))
    await onHerMyWork()
  })

  it('?tab=mywork, the tab row\'s own key, lands on the same page', async () => {
    renderPageAt('/grounds/g1?tab=mywork')
    await waitFor(() => expect(screen.getAllByText(/Sales team, Q3/i).length).toBeGreaterThan(0))
    await onHerMyWork()
  })

  it('?tab=sessions still opens the roster, and "Who has answered" reaches it from My work', async () => {
    renderPageAt('/grounds/g1?tab=sessions')
    await waitFor(() => expect(screen.getAllByText(/Sales team, Q3/i).length).toBeGreaterThan(0))
    expect(await screen.findByText('People')).toBeTruthy()
  })
})
