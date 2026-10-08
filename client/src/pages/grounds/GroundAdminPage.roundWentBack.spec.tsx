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
 *
 * B-064, DECISION TO REQUIRE EVIDENCE OF AN ACTUAL ADDITION: the arithmetic above is still
 * necessary but, on its own, is also true of two people who have ALWAYS been in the check-in and
 * have simply answered very different numbers of times - exactly what E1 on Riverbank Trading's
 * old data found (docs/existing-users-check.md): "It went back to session 2, because somebody new
 * was added." on a check-in where nobody had been added; the old data just carried one person's
 * session count much further than another's. `roundWentBack` now also asks whether somebody who is
 * behind joined the check-in LATER than somebody who is ahead (`createdAt`), which is the nearest
 * honest evidence already on the page that a newcomer, rather than old data, caused the gap. The
 * second test below now gives `p-b` a later `createdAt` than `p-a`, so it keeps testing a genuine
 * addition; a third test pins the old-data case the bug found, where nobody's `createdAt` says a
 * later join happened.
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
    // p-a has already finished sessions 1 and 2 (two completed sessions), and joined back in
    // January. p-b has finished nothing and joined in October - after p-a was already ahead -
    // which is the actual evidence that p-b is the newcomer who pulled the open round back.
    g.participants = g.participants.map((p: any) =>
      p.id === 'p-a' ? { ...p, createdAt: '2026-01-05' } : p.id === 'p-b' ? { ...p, createdAt: '2026-10-01' } : p,
    )
    g.checkIns = [
      { id: 'c1', sessionNumber: 1, status: 'COMPLETED', participantId: 'p-a', completedAt: '2026-09-01' },
      { id: 'c2', sessionNumber: 2, status: 'COMPLETED', participantId: 'p-a', completedAt: '2026-09-08' },
    ]
    ;(groundsApi.get as any).mockResolvedValue(g)
    renderPage()
    await waitFor(() => expect(screen.getAllByText(/Amara - Onboarding/i).length).toBeGreaterThan(0))
    expect(await screen.findByText(/It went back to session 1, because somebody new was added\. Nothing anybody wrote is lost\./i)).toBeTruthy()
  })

  /**
   * B-064: OLD DATA, NOT A NEW ADDITION. Riverbank Trading's imported check-ins gave every
   * participant the same `createdAt` (the migration ran once, for everybody, on release day), yet
   * one person's stray session numbers put them far ahead of another. Nobody was added after the
   * round opened, so the sentence must not guess that somebody was.
   */
  it('does not show it when the gap is old data, not a later join - everybody has the same createdAt', async () => {
    const g = baseGround()
    g.participants = g.participants.map((p: any) => ({ ...p, createdAt: '2026-10-08' }))
    g.checkIns = [
      { id: 'c1', sessionNumber: 1, status: 'COMPLETED', participantId: 'p-a', completedAt: '2026-06-01' },
      { id: 'c2', sessionNumber: 2, status: 'COMPLETED', participantId: 'p-a', completedAt: '2026-06-08' },
    ]
    ;(groundsApi.get as any).mockResolvedValue(g)
    renderPage()
    await waitFor(() => expect(screen.getAllByText(/Amara - Onboarding/i).length).toBeGreaterThan(0))
    expect(screen.queryByText(/It went back to session/i)).toBeNull()
  })

  it('does not show it when nobody has a createdAt at all - there is no evidence either way', async () => {
    const g = baseGround()
    g.checkIns = [
      { id: 'c1', sessionNumber: 1, status: 'COMPLETED', participantId: 'p-a', completedAt: '2026-06-01' },
      { id: 'c2', sessionNumber: 2, status: 'COMPLETED', participantId: 'p-a', completedAt: '2026-06-08' },
    ]
    ;(groundsApi.get as any).mockResolvedValue(g)
    renderPage()
    await waitFor(() => expect(screen.getAllByText(/Amara - Onboarding/i).length).toBeGreaterThan(0))
    expect(screen.queryByText(/It went back to session/i)).toBeNull()
  })
})
