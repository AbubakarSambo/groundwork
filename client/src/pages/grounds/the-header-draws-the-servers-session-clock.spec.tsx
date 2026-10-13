import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GroundAdminPage } from './GroundAdminPage'
import { groundsApi } from '@/api/grounds'

/**
 * DRAWN FROM THE SERVER'S OWN CLOCK (8 October, night note item 5, B-112).
 *
 * `GET /grounds/:id` now serves `sessionClock`: `says` ("Session 2 of 12.", the same board sentence,
 * request 101 f) and `whileOpen` ("Session 3 has started for some people, while session 2 is still
 * open.") - a true second sentence for when a later session has started for some people while an
 * earlier one is still open for others, something this header could not say at all before. Both are
 * read together now, as one joined line.
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

function ground(sessionClock?: { currentSession: number; plannedSessions: number | null; says: string; whileOpen: string | null }) {
  const participants = [
    { id: 'p-lead', userId: 'u-lead', email: 'lead@x.test', partyType: 'INITIATOR', accepted: true },
    { id: 'p-a', userId: 'u-a', email: 'a@x.test', partyType: 'PARTICIPANT', accepted: true },
  ]
  return {
    id: 'g1', label: 'Sales team, Q3', status: 'OPEN', scenario: 'SALES', timelineDays: 360,
    cadence: 'MONTHLY', daysLeft: 300, overdue: 0, initiatorId: 'u-lead',
    participants,
    checkIns: [
      { id: 'c1', sessionNumber: 1, status: 'COMPLETED', participantId: 'p-lead', completedAt: '2026-09-01' },
      { id: 'c2', sessionNumber: 1, status: 'COMPLETED', participantId: 'p-a', completedAt: '2026-09-01' },
    ],
    boardRenders: true,
    ...(sessionClock ? { sessionClock } : {}),
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

describe('the check-in header draws the server\'s sessionClock', () => {
  it('reads sessionClock.says, not the client\'s own count, when the server sends it', async () => {
    (groundsApi.get as any).mockResolvedValue(ground({ currentSession: 2, plannedSessions: 12, says: 'Session 2 of 12.', whileOpen: null }))
    renderPage()
    await waitFor(() => expect(screen.getAllByText(/Sales team, Q3/i).length).toBeGreaterThan(0))
    expect(await screen.findByText(/Session 2 of 12\./)).toBeTruthy()
  })

  it('reads whileOpen beside says, as one joined line, when a later session has started for some people', async () => {
    (groundsApi.get as any).mockResolvedValue(ground({
      currentSession: 2, plannedSessions: 12, says: 'Session 2 of 12.',
      whileOpen: 'Session 3 has started for some people, while session 2 is still open.',
    }))
    renderPage()
    await waitFor(() => expect(screen.getAllByText(/Sales team, Q3/i).length).toBeGreaterThan(0))
    expect(await screen.findByText(/Session 2 of 12\. Session 3 has started for some people, while session 2 is still open\./)).toBeTruthy()
  })

  it('says nothing of whileOpen when the server sends null', async () => {
    (groundsApi.get as any).mockResolvedValue(ground({ currentSession: 2, plannedSessions: 12, says: 'Session 2 of 12.', whileOpen: null }))
    renderPage()
    await waitFor(() => expect(screen.getAllByText(/Sales team, Q3/i).length).toBeGreaterThan(0))
    expect(screen.queryByText(/has started for some people/)).toBeNull()
  })

  it('falls back to the client\'s own count when the server sends no sessionClock at all', async () => {
    (groundsApi.get as any).mockResolvedValue(ground())
    renderPage()
    await waitFor(() => expect(screen.getAllByText(/Sales team, Q3/i).length).toBeGreaterThan(0))
    expect(await screen.findByText(/Session 2 of/)).toBeTruthy()
  })
})
