import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GroundAdminPage } from './GroundAdminPage'
import { groundsApi } from '@/api/grounds'

/**
 * FAULT 3: "MY WORK" HAS TO GO TO ONE PLACE, HOWEVER IT WAS REACHED.
 *
 * Rukia leads "Sales team, Q3" and also takes part in it (the ordinary case: a lead who checks in
 * too). The check-in page's own tab row used to send her to `myrecord` - her own account - when
 * she clicked "My work" from inside the page, while the board's tab row and `ground-tabs.ts`'s
 * `checkInHeaderTabs` (used by the report pages) send the same "My work" label to `?tab=sessions`,
 * which this page reads as the `checkins` roster. Same label, two destinations.
 *
 * The prototype draws the line on who RUNS the check-in, not who is also a party to it
 * (sessions.txt: the lead's own "My work" opens "Every session", the roster). So both routes must
 * land Rukia on the same tab: `checkins`, the roster of who has answered.
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
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn() } }))

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
  it('clicking "My work" from inside the check-in page lands the lead on the roster, not her own record', async () => {
    renderPageAt('/grounds/g1')
    await waitFor(() => expect(screen.getAllByText(/Sales team, Q3/i).length).toBeGreaterThan(0))
    fireEvent.click(screen.getByRole('tab', { name: 'My work' }))
    // The roster lives under a "People" heading (WHO IS IN IT, AND WHO HAS ANSWERED); her own
    // record page (YourWork.tsx) does not render that heading.
    expect(await screen.findByText('People')).toBeTruthy()
  })

  it('arriving at ?tab=sessions, as the board\'s own "My work" link sends a lead, shows the same roster', async () => {
    renderPageAt('/grounds/g1?tab=sessions')
    await waitFor(() => expect(screen.getAllByText(/Sales team, Q3/i).length).toBeGreaterThan(0))
    expect(await screen.findByText('People')).toBeTruthy()
  })
})
