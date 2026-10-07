import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GroundAdminPage } from './GroundAdminPage'
import { groundsApi } from '@/api/grounds'

/**
 * FAULT 6: THE HEADER HAS TO AGREE WITH PEOPLE AND SETUP AND THE SIDEBAR.
 *
 * A `REPORT_READY` ground read "Report being written." in this page's own header, "The report is
 * ready to read." on its People and setup tab (`whatThisStatusMeans`, read straight off
 * `ground.status`), and "Report ready" in the sidebar (`AppShell.tsx`'s `GroundStatusBadge`, also
 * straight off `ground.status`). The header worked out its own answer from `ground.report` and the
 * round instead of reading the same field. It now checks `ground.status === 'REPORT_READY'` first.
 */
vi.mock('@/stores/auth', () => ({
  useAuthStore: (sel: any) => sel({ user: { id: 'u-lead', role: 'MEMBER', email: 'lead@x.test' }, isAuthenticated: true }),
}))
vi.mock('@/api/participantRequests', () => ({ participantRequestsApi: { list: vi.fn().mockResolvedValue([]) } }))
vi.mock('@/api/reports', () => ({ reportsApi: { get: vi.fn() } }))
vi.mock('@/api/documents', () => ({ documentsApi: { list: vi.fn() } }))
vi.mock('@/api/resolution', () => ({ resolutionApi: { get: vi.fn().mockResolvedValue(null), propose: vi.fn() } }))
vi.mock('@/api/conversation', () => ({ conversationApi: { remind: vi.fn() } }))
vi.mock('@/api/billing', () => ({ billingApi: { status: vi.fn().mockResolvedValue(null), getContributorCodeShareCard: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn() } }))

function ground() {
  return {
    id: 'g1', label: 'Amara - Review', status: 'REPORT_READY', scenario: 'SALES', timelineDays: 30,
    cadence: 'ONE_TIME', daysLeft: 2, overdue: 0, initiatorId: 'u-lead',
    // A report row exists (generated), but with no releasedAt - the state REPORT_READY describes.
    report: { id: 'r1', releasedAt: null },
    participants: [
      { id: 'p-lead', userId: 'u-lead', email: 'lead@x.test', partyType: 'INITIATOR', accepted: true },
      { id: 'p-a', userId: 'u-a', email: 'a@x.test', partyType: 'PARTICIPANT', accepted: true },
    ],
    checkIns: [
      { id: 'c1', sessionNumber: 1, status: 'COMPLETED', participantId: 'p-lead', completedAt: '2026-09-01' },
      { id: 'c2', sessionNumber: 1, status: 'COMPLETED', participantId: 'p-a', completedAt: '2026-09-01' },
    ],
    roundCompletions: [{ sessionNumber: 1 }],
    boardRenders: true,
  }
}

function renderPage(initialEntry = '/grounds/g1') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes><Route path="/grounds/:id" element={<GroundAdminPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  ;(groundsApi.get as any).mockResolvedValue(ground())
})

describe('the header reads the same report state as People and setup and the sidebar', () => {
  /*
   * FAULT 4 (LIVE RE-WALK): "READY TO READ" READ AS "SHARED", AND IT IS NOT THE SAME CLAIM.
   * This pinned "The report is ready to read." for a `REPORT_READY` ground with no `releasedAt` -
   * true, but it said nothing about sharing, while People and setup's own "The team's report" row
   * (CheckInPeopleAndSetup.tsx) read "Not shared yet..." for the very same ground, as if the report
   * were not ready at all. The header now says both halves, in the same words setup now does: the
   * report is ready, and it has not been shared yet.
   */
  it('says the report is ready and that it has not been shared yet, not that it is still being written', async () => {
    renderPage()
    await waitFor(() => expect(screen.getAllByText(/Amara - Review/i).length).toBeGreaterThan(0))
    expect(await screen.findByText(/The report is ready\. It has not been shared yet\./)).toBeTruthy()
    expect(screen.queryByText(/Report being written\./)).toBeNull()
  })

  /*
   * FAULT 4 (LIVE RE-WALK): PEOPLE AND SETUP'S "THE TEAM'S REPORT" ROW NOW AGREES WITH THE HEADER.
   * It used to read "Not shared yet. Share it from the report when it is ready." for this same
   * `REPORT_READY` ground - true about sharing, but written as if the report were not ready, which
   * is the half the header already got right. Both now say the same thing.
   */
  it('and People and setup says the same thing about the same ground', async () => {
    renderPage('/grounds/g1?tab=settings')
    expect(await screen.findByText('The report is ready. It has not been shared yet.')).toBeTruthy()
    expect(screen.queryByText('Not shared yet. Share it from the report when it is ready.')).toBeNull()
  })
})
