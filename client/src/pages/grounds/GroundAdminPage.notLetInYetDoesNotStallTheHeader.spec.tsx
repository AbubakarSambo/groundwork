import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GroundAdminPage } from './GroundAdminPage'
import { groundsApi } from '@/api/grounds'

/**
 * REQUEST 174, ITEM 2 (report tab, fault d): "Session 1 of 12" stuck on the header while session 2
 * was being answered.
 *
 * The header's own "which session is this check-in on" counted every row of `ground.participants`
 * unfiltered - including somebody held at the organisation's door (`notLetInYet`, decision 77).
 * That person never has a completed session and never will, so their row stayed permanently empty
 * and permanently capped "the lowest number anybody has finished" at zero - the header read
 * "Session 1" for ever, however far everybody actually let in had gone. `whoIsInRound`, used two
 * lines below this for the roster and the counter, already leaves them out; the header now does
 * the same, so it reads the same state the rest of the page does.
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

function baseGround() {
  return {
    id: 'g1', label: 'Sales team, Q3', status: 'ACTIVE', scenario: 'SALES', timelineDays: 360,
    cadence: 'MONTHLY', plannedSessions: 12, daysLeft: 300, overdue: 0, initiatorId: 'u-lead',
    participants: [
      { id: 'p-lead', userId: 'u-lead', email: 'lead@x.test', partyType: 'INITIATOR', accepted: true },
      { id: 'p-a', userId: 'u-a', email: 'a@x.test', partyType: 'PARTICIPANT', accepted: true },
      { id: 'p-b', userId: 'u-b', email: 'b@x.test', partyType: 'PARTICIPANT', accepted: true },
      /* Held at the organisation's door - invited, but not yet let in. Never has a completed
         session, and is not one of the people this round is waiting on (decision 77). */
      { id: 'p-c', userId: 'u-c', email: 'c@x.test', partyType: 'PARTICIPANT', accepted: false, notLetInYet: true },
    ],
    checkIns: [] as any[],
    boardRenders: true,
  }
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds/g1']}>
        <Routes><Route path="/grounds/:id" element={<GroundAdminPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => vi.clearAllMocks())

describe('somebody not let in yet does not stall the header on "Session 1"', () => {
  it('reads "Session 2" once everybody who is actually in the round has finished session 1', async () => {
    const g = baseGround()
    g.checkIns = [
      { id: 'c1', sessionNumber: 1, status: 'COMPLETED', participantId: 'p-lead', completedAt: '2026-09-01' },
      { id: 'c2', sessionNumber: 1, status: 'COMPLETED', participantId: 'p-a', completedAt: '2026-09-01' },
      { id: 'c3', sessionNumber: 1, status: 'COMPLETED', participantId: 'p-b', completedAt: '2026-09-02' },
      // p-c (notLetInYet) has no check-in at all, and never will until let in.
    ]
    ;(groundsApi.get as any).mockResolvedValue(g)
    renderPage()
    await waitFor(() => expect(screen.getAllByText(/Sales team, Q3/i).length).toBeGreaterThan(0))
    expect(await screen.findByText(/Session 2 of 12\./)).toBeTruthy()
    expect(screen.queryByText(/Session 1 of 12\./)).toBeNull()
  })
})
