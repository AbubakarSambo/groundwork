import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GroundAdminPage } from './GroundAdminPage'
import { groundsApi } from '@/api/grounds'

/**
 * RESTORED (8 October, nothing-removed audit S1): "BEGIN THE LAST CHECK-IN" AT ANY TIME WHILE THE
 * CHECK-IN RUNS.
 *
 * This file used to prove the opposite: that the button was gated on `nearTheEnd` (its last
 * session is the next one). That gate was itself fault 4 from the live re-walk - live showed this
 * button to the lead throughout the whole run, including on a check-in with no planned number of
 * sessions, gated only on the check-in's status. No decision of Hafsah's ever asked for the
 * `nearTheEnd` gate; the audit found it loses a real thing a lead could do on live (close early
 * with a final conversation, on any check-in, at any point), so it is removed and this spec now
 * proves the restored behaviour instead of the fault.
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

/* MONTHLY, 180 days: 6 planned sessions (timelineDays / cadence days = 180 / 30). `doneOf`
   completed sessions exist for every participant. */
function ground(doneOf: number, overrides: Record<string, any> = {}) {
  const participants = [
    { id: 'p-lead', userId: 'u-lead', email: 'lead@x.test', partyType: 'INITIATOR', accepted: true },
    { id: 'p-a', userId: 'u-a', email: 'a@x.test', partyType: 'PARTICIPANT', accepted: true },
  ]
  const checkIns = participants.flatMap((p) =>
    Array.from({ length: doneOf }, (_, i) => ({
      id: `${p.id}-s${i + 1}`, sessionNumber: i + 1, status: 'COMPLETED', participantId: p.id, completedAt: '2026-09-01',
    })),
  )
  return {
    id: 'g1', label: 'Sales team, Q3', status: 'OPEN', scenario: 'SALES', timelineDays: 180,
    cadence: 'MONTHLY', daysLeft: 30, overdue: 0, initiatorId: 'u-lead',
    report: null,
    participants,
    checkIns,
    roundCompletions: Array.from({ length: doneOf }, (_, i) => ({ sessionNumber: i + 1 })),
    boardRenders: true,
    ...overrides,
  }
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds/g1?tab=sessions']}>
        <Routes><Route path="/grounds/:id" element={<GroundAdminPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => { vi.clearAllMocks() })

describe('"End early with a last check-in" is offered throughout the run, as live had it', () => {
  it('is offered in session 1 of 6, five sessions from the end', async () => {
    (groundsApi.get as any).mockResolvedValue(ground(0))
    renderPage()
    await waitFor(() => expect(screen.getAllByText(/Sales team, Q3/i).length).toBeGreaterThan(0))
    expect(await screen.findByText('End early with a last check-in')).toBeTruthy()
  })

  it('is offered once session 6 - the last one - is next', async () => {
    (groundsApi.get as any).mockResolvedValue(ground(5))
    renderPage()
    await waitFor(() => expect(screen.getAllByText(/Sales team, Q3/i).length).toBeGreaterThan(0))
    expect(await screen.findByText('End early with a last check-in')).toBeTruthy()
  })

  it('is offered on a check-in with no planned number of sessions', async () => {
    (groundsApi.get as any).mockResolvedValue(ground(0, { timelineDays: null }))
    renderPage()
    await waitFor(() => expect(screen.getAllByText(/Sales team, Q3/i).length).toBeGreaterThan(0))
    expect(await screen.findByText('End early with a last check-in')).toBeTruthy()
  })

  it('is not offered once the check-in has closed', async () => {
    (groundsApi.get as any).mockResolvedValue(ground(0, { status: 'CLOSED' }))
    renderPage()
    await waitFor(() => expect(screen.getAllByText(/Sales team, Q3/i).length).toBeGreaterThan(0))
    /* ?tab=sessions opens People and setup's one list now (page audit, 24 November 2026, row 8), where this control moved. */
    await screen.findByRole('heading', { name: "Who's in it" })
    expect(screen.queryByText('End early with a last check-in')).toBeNull()
  })
})
