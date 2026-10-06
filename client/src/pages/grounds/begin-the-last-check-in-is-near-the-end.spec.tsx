import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GroundAdminPage } from './GroundAdminPage'
import { groundsApi } from '@/api/grounds'

/**
 * FAULT 4 (LIVE RE-WALK): "BEGIN THE LAST CHECK-IN" OFFERED IN SESSION 1 OF 6.
 *
 * My work's Sessions tab offered this red, wide button - ending the whole engagement - with five
 * more sessions still to come, and nothing on screen saying that was early. It now shows only once
 * the check-in is near its end: its last session is the next one (`sessionsDone >= plannedSessions
 * - 1`, the same rule the board already uses for its own ending control, `whereTheRunIs` in
 * BoardPage.tsx).
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

/* MONTHLY, 180 days: 6 planned sessions (timelineDays / cadence days = 180 / 30). `sessionsDone`
   completed sessions among them, so `doneOf` completed rows exist for every participant. */
function ground(doneOf: number) {
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

describe('"Begin the last check-in" only once the check-in is near its end', () => {
  it('is not offered in session 1 of 6, five sessions from the end', async () => {
    (groundsApi.get as any).mockResolvedValue(ground(0))
    renderPage()
    await waitFor(() => expect(screen.getAllByText(/Sales team, Q3/i).length).toBeGreaterThan(0))
    await screen.findByText('People')
    expect(screen.queryByText('Begin the last check-in')).toBeNull()
  })

  it('is offered once session 6 - the last one - is next', async () => {
    (groundsApi.get as any).mockResolvedValue(ground(5))
    renderPage()
    await waitFor(() => expect(screen.getAllByText(/Sales team, Q3/i).length).toBeGreaterThan(0))
    expect(await screen.findByText('Begin the last check-in')).toBeTruthy()
  })
})
