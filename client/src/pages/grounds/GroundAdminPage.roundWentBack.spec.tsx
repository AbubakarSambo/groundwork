import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GroundAdminPage } from './GroundAdminPage'
import { groundsApi } from '@/api/grounds'

/**
 * FAULT 1: A FALSE "IT WENT BACK TO SESSION 1" SENTENCE ON EVERY RUNNING CHECK-IN.
 *
 * `roundWentBack` compared a participant's completed-session count with `>= openRound`. The
 * ordinary, correct state of a running check-in - one person has finished the open session and
 * nobody else has yet - has that person's count exactly equal to `openRound`, so `>=` fired on
 * every such check-in even though nobody was added and the round never moved. The sentence is
 * only true when somebody has finished MORE sessions than the round that is currently open,
 * which can only happen if the round genuinely moved back under them (a new, undone participant
 * pulled the open round down after the others had already gone further).
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
    id: 'g1', label: 'Amara - Onboarding', status: 'ACTIVE', scenario: 'NEW_HIRE', timelineDays: 90,
    cadence: 'MONTHLY', plannedSessions: 6, daysLeft: 80, overdue: 0, initiatorId: 'u-lead',
    participants: [
      { id: 'p-lead', userId: 'u-lead', email: 'lead@x.test', partyType: 'INITIATOR', accepted: true },
      { id: 'p-a', userId: 'u-a', email: 'a@x.test', partyType: 'PARTICIPANT', accepted: true },
      { id: 'p-b', userId: 'u-b', email: 'b@x.test', partyType: 'PARTICIPANT', accepted: true },
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

beforeEach(() => {
  vi.clearAllMocks()
})

describe('the "went back" sentence only appears when the round truly moved back', () => {
  it('does not show it when one person has simply finished the open session first', async () => {
    const g = baseGround()
    // One person (p-a) has finished session 1; nobody else has. This is ordinary forward
    // progress - the open round is still 1 - and must not read as the round going backward.
    g.checkIns = [
      { id: 'c1', sessionNumber: 1, status: 'COMPLETED', participantId: 'p-a', completedAt: '2026-09-01' },
    ]
    ;(groundsApi.get as any).mockResolvedValue(g)
    renderPage()
    await waitFor(() => expect(screen.getAllByText(/Amara - Onboarding/i).length).toBeGreaterThan(0))
    expect(screen.queryByText(/It went back to session/i)).toBeNull()
  })

  it('shows it when a newly added, undone person pulls the open round back under somebody further ahead', async () => {
    const g = baseGround()
    // p-a has already finished sessions 1 and 2 (two completed sessions). p-b has finished
    // nothing, which pulls the open round back down to session 1 - behind what p-a already did.
    g.checkIns = [
      { id: 'c1', sessionNumber: 1, status: 'COMPLETED', participantId: 'p-a', completedAt: '2026-09-01' },
      { id: 'c2', sessionNumber: 2, status: 'COMPLETED', participantId: 'p-a', completedAt: '2026-09-08' },
    ]
    ;(groundsApi.get as any).mockResolvedValue(g)
    renderPage()
    await waitFor(() => expect(screen.getAllByText(/Amara - Onboarding/i).length).toBeGreaterThan(0))
    expect(await screen.findByText(/It went back to session 1, because somebody new was added\. Nothing anybody wrote is lost\./i)).toBeTruthy()
  })
})
