import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GroundAdminPage } from './GroundAdminPage'
import { groundsApi } from '@/api/grounds'

/**
 * B-100: THE REST OF MY WORK STILL COUNTS A LEAD WHO ONLY MANAGES.
 *
 * B-080 fixed "Your sessions" (People and setup) and the stat tile on My work - a lead who only
 * manages (Baraka, `HELP_TEAM_UNDERSTAND`, so `managingOnly`) reads "You run this check-in and do
 * not check in yourself." there. The anchor walk (9 October) found the rest of the page still
 * treated him as somebody who checks in:
 *   - the Check-ins tab's own "People" list still listed his row, "Not started" with "Copy
 *     check-in link", though he never has a session to start;
 *   - the "once all N are in" notice under that list still counted him in N, reading "once all
 *     three people are in" when only Halima and Daudi were ever going to answer;
 *   - "Your reports" on his own My work page (`?tab=record`) read "Session 1, your own" with a
 *     report to open, built from his one completed check-in row - which is `isSetup: true`, not a
 *     session, the same rule `sessionsDoneBy`/`mySessionDots`/the session grid already apply, and
 *     which the very same page's "Your check-ins" list correctly reads as "Nothing on record
 *     yet."
 *
 * All three are fixed the same way as B-077/B-078/B-080: a managing-only lead is left out of a
 * count or a list of people who check in, not relabelled within it.
 *
 * 4 November 2026: since Release 1B's switch went, My work is the B7 page for a lead too, drawn from GET
 * /grounds/:id/my-work, and "Your reports" is the server's (my-work.ts reads a person's check-ins with `isSetup: false`, so
 * the set-up conversation is never one of them). The third case now checks that the page draws the server's reports and
 * never builds "Session 1, your own" from the ground's own setup row; "You check in when you choose" is read where it is
 * now, under "Your sessions" on People and setup.
 */
let currentUser: { id: string; role: string; email: string }
vi.mock('@/stores/auth', () => ({
  useAuthStore: (sel: any) => sel({ user: currentUser, isAuthenticated: true }),
}))
vi.mock('@/api/grounds', async () => {
  const { SERVED_TO_THE_LEAD } = await import('./my-work-served.fixture')
  return { groundsApi: { get: vi.fn(), myWork: vi.fn().mockResolvedValue(SERVED_TO_THE_LEAD) } }
})
vi.mock('@/api/participantRequests', () => ({ participantRequestsApi: { list: vi.fn().mockResolvedValue([]) } }))
vi.mock('@/api/reports', () => ({ reportsApi: { get: vi.fn() } }))
vi.mock('@/api/documents', () => ({ documentsApi: { list: vi.fn() } }))
vi.mock('@/api/resolution', () => ({ resolutionApi: { get: vi.fn().mockResolvedValue(null), propose: vi.fn() } }))
vi.mock('@/api/conversation', () => ({ conversationApi: { remind: vi.fn() } }))
vi.mock('@/api/billing', () => ({ billingApi: { status: vi.fn().mockResolvedValue(null), getContributorCodeShareCard: vi.fn() } }))

function renderPage(tab: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/grounds/g1?tab=${tab}`]}>
        <Routes><Route path="/grounds/:id" element={<GroundAdminPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  currentUser = { id: 'u-baraka', role: 'ADMIN', email: 'baraka@msingi.test' }
})

const groundWithAManagingLead = {
  id: 'g1', label: 'Help my team understand', status: 'ACTIVE', scenario: 'HELP_TEAM_UNDERSTAND',
  timelineDays: 30, cadence: 'WEEKLY', totalSessions: 4, daysLeft: 25, overdue: 0, initiatorId: 'u-baraka',
  participants: [
    { id: 'p-baraka', userId: 'u-baraka', email: 'baraka@msingi.test', partyType: 'INITIATOR', managingOnly: true, user: { firstName: 'Baraka', lastName: 'Mutua' } },
    { id: 'p-halima', userId: 'u-halima', email: 'halima@msingi.test', user: { firstName: 'Halima', lastName: 'Yusuf' } },
    { id: 'p-daudi', userId: null, email: 'daudi@msingi.test', user: null },
  ],
  checkIns: [
    { id: 'c-setup', participantId: 'p-baraka', sessionNumber: 1, status: 'COMPLETED', isSetup: true, completedAt: '2026-10-01T00:00:00Z' },
  ],
  report: { releasedAt: null },
  boardRenders: true,
}

describe('a lead who only manages: the rest of My work leaves her out, same as "Your sessions"', () => {
  it('is not a row in the Check-ins tab\'s "People" list', async () => {
    ;(groundsApi.get as any).mockResolvedValue(groundWithAManagingLead)
    renderPage('checkins')
    await screen.findByText('Halima Yusuf')
    expect(screen.queryByText('Baraka Mutua')).toBeNull()
    expect(screen.queryByText('baraka@msingi.test')).toBeNull()
  })

  it('is not counted in "once all N people are in" under that list', async () => {
    ;(groundsApi.get as any).mockResolvedValue(groundWithAManagingLead)
    renderPage('checkins')
    expect(await screen.findByText(/once all two people are in/)).toBeTruthy()
    expect(screen.queryByText(/once all three people are in/)).toBeNull()
  })

  it('reads the server\'s "Your reports", never a report built from her setup row, on her own My work', async () => {
    ;(groundsApi.get as any).mockResolvedValue(groundWithAManagingLead)
    renderPage('record')
    expect(await screen.findByText('No reports yet.')).toBeTruthy()
    expect((groundsApi.myWork as any).mock.calls[0][0]).toBe('g1')
    expect(screen.queryByText('Session 1, your own')).toBeNull()
  })

  it('reads "You check in when you choose" under "Your sessions" on People and setup', async () => {
    ;(groundsApi.get as any).mockResolvedValue(groundWithAManagingLead)
    renderPage('settings')
    expect(await screen.findByText('You check in when you choose. Use Check in yourself any time.')).toBeTruthy()
  })
})
