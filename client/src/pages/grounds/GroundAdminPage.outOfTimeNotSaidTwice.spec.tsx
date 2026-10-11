import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GroundAdminPage } from './GroundAdminPage'
import { groundsApi } from '@/api/grounds'

/**
 * B-215 (review 5): Mira, on a stalled check-in, read the "Out of time" box ("This check-in ran
 * past the time it was given...") and then, right below it, the session line ended with the bare
 * word "Out of time" a second time - the same fact, said twice, the second time with no sentence
 * of its own. The session line now says nothing more about it once the box above has said it.
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

function stalledGround() {
  return {
    id: 'g1', label: 'Mira - Leadership', status: 'STALLED', scenario: 'NEW_HIRE', timelineDays: 90,
    cadence: 'MONTHLY', plannedSessions: 6, daysLeft: 0, overdue: 0, initiatorId: 'u-lead',
    viewerRunsThisGround: true,
    participants: [
      { id: 'p-lead', userId: 'u-lead', email: 'lead@x.test', partyType: 'INITIATOR', accepted: true },
      { id: 'p-a', userId: 'u-a', email: 'a@x.test', partyType: 'PARTICIPANT', accepted: true },
    ],
    checkIns: [
      { id: 'c1', sessionNumber: 1, status: 'COMPLETED', participantId: 'p-a', completedAt: '2026-09-01' },
    ],
    boardRenders: true,
  }
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds/g1?tab=checkins']}>
        <Routes><Route path="/grounds/:id" element={<GroundAdminPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('B-215: "Out of time" is said once, not twice', () => {
  it('shows the "Out of time" box, but the session line does not also end with the bare words "Out of time"', async () => {
    (groundsApi.get as any).mockResolvedValue(stalledGround())
    renderPage()
    await waitFor(() => expect(screen.getAllByText(/Mira - Leadership/i).length).toBeGreaterThan(0))
    expect(await screen.findByText(/This check-in ran past the time it was given\. Nobody can add to it until you give it more time\./i)).toBeTruthy()
    // The bare word "Out of time" must appear only once on the page: the box's own title.
    expect(screen.getAllByText('Out of time').length).toBe(1)
  })
})

/*
 * B-215 (REVIEW 6): THE CHECK-IN TAB'S OWN BLUE BOX SAID "ENDED" ABOUT A CHECK-IN THAT HAS NOT.
 * `howItEnded` reads "Out of time" for a STALLED ground too, and before this fix the Check-in tab
 * (`tab === 'chat'`) drew that in a blue box with "Go to the board to read how it ended and why" -
 * untrue on both counts: nobody decided anything, and Mira can still give it more time. Walked live
 * on "Where next, part 5" (404177bc, STALLED).
 */
describe('B-215: the Check-in tab\'s own box, for a stalled check-in', () => {
  it('reads "You can read what happened so far on the board.", not "ended" or "why"', async () => {
    const stalled = stalledGround()
    ;(groundsApi.get as any).mockResolvedValue(stalled)
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/grounds/g1']}>
          <Routes><Route path="/grounds/:id" element={<GroundAdminPage />} /></Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    await waitFor(() => expect(screen.getAllByText(/Mira - Leadership/i).length).toBeGreaterThan(0))
    expect(await screen.findByText(/You can read what happened so far on the/i)).toBeTruthy()
    expect(screen.queryByText(/to read how it ended and why/i)).toBeNull()
    expect(screen.getByRole('link', { name: 'board' }).getAttribute('href')).toBe('/grounds/g1/board')
  })
})
