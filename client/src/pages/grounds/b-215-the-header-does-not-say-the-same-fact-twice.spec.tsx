import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GroundAdminPage } from './GroundAdminPage'
import { groundsApi } from '@/api/grounds'

/**
 * B-215 (REVIEW 4): THE HEADER SAID THE SAME FACT TWICE.
 *
 * Mira read "Time is up. The time given to this check-in is up. Nobody can add to it after
 * tonight unless you give it more time." then, right below it, "Session 2 of 12. The time given to
 * this check-in ends today. One of the three people has checked in for session 2." - the same fact
 * ("the time given to this check-in is up" / "ends today") said once in each box.
 *
 * `daysLeft === 0` is exactly the case the warning box above reads as "out" (`whenItRunsOut`), so
 * the session line now says nothing extra for it - the box already carries it. The other branch,
 * "2 days remain.", was also a clipped fragment rather than a sentence; it now reads "The time
 * given to this check-in ends in 2 days." (and "in 1 day" for one day left).
 */
vi.mock('@/stores/auth', () => ({
  useAuthStore: (sel: any) => sel({ user: { id: 'u-mira', role: 'ADMIN', email: 'mira@x.test' }, isAuthenticated: true }),
}))
vi.mock('@/api/participantRequests', () => ({ participantRequestsApi: { list: vi.fn().mockResolvedValue([]) } }))
vi.mock('@/api/reports', () => ({ reportsApi: { get: vi.fn().mockResolvedValue(null) } }))
vi.mock('@/api/documents', () => ({ documentsApi: { list: vi.fn().mockResolvedValue([]) } }))
vi.mock('@/api/resolution', () => ({ resolutionApi: { get: vi.fn().mockResolvedValue(null), propose: vi.fn() } }))
vi.mock('@/api/conversation', () => ({ conversationApi: { remind: vi.fn() } }))
vi.mock('@/api/billing', () => ({ billingApi: { status: vi.fn().mockResolvedValue(null), getContributorCodeShareCard: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn() } }))

function ground(daysLeft: number) {
  return {
    id: 'g1', label: 'Sales team, Q3', status: 'ACTIVE', scenario: 'SALES', timelineDays: 90,
    cadence: 'FORTNIGHTLY', daysLeft, overdue: 0, initiatorId: 'u-mira',
    report: null,
    participants: [
      { id: 'p-lead', userId: 'u-mira', email: 'mira@x.test', partyType: 'INITIATOR', accepted: true },
      { id: 'p-a', userId: 'u-a', email: 'a@x.test', partyType: 'PARTICIPANT', accepted: true },
      { id: 'p-b', userId: 'u-b', email: 'b@x.test', partyType: 'PARTICIPANT', accepted: true },
    ],
    checkIns: [
      { id: 'c1', sessionNumber: 2, status: 'COMPLETED', participantId: 'p-lead', completedAt: '2026-09-23' },
      { id: 'c2', sessionNumber: 2, status: 'NOT_STARTED', participantId: 'p-a' },
      { id: 'c3', sessionNumber: 2, status: 'NOT_STARTED', participantId: 'p-b' },
    ],
    roundCompletions: [],
    boardRenders: true,
  }
}

function renderPage(daysLeft: number) {
  ;(groundsApi.get as any).mockResolvedValue(ground(daysLeft))
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds/g1']}>
        <Routes><Route path="/grounds/:id" element={<GroundAdminPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => { vi.clearAllMocks() })

describe('the header, when the check-in\'s time is up today', () => {
  it('shows "Time is up" once, and does not also say "ends today" in the session line', async () => {
    renderPage(0)
    await screen.findByText('Time is up')
    expect(await screen.findByText(/The time given to this check-in is up\./)).toBeTruthy()
    expect(screen.queryByText(/ends today/)).toBeNull()
  })
})

describe('the header, with two days left', () => {
  it('reads "The time given to this check-in ends in 2 days.", not "2 days remain."', async () => {
    renderPage(2)
    await waitFor(() => expect(screen.getAllByText(/Sales team, Q3/i).length).toBeGreaterThan(0))
    expect(await screen.findByText(/The time given to this check-in ends in 2 days\./)).toBeTruthy()
    expect(screen.queryByText(/days remain/)).toBeNull()
  })
})

describe('the header, with one day left', () => {
  it('reads "...in 1 day.", not "...in 1 days." or "1 day remain."', async () => {
    renderPage(1)
    await waitFor(() => expect(screen.getAllByText(/Sales team, Q3/i).length).toBeGreaterThan(0))
    expect(await screen.findByText(/The time given to this check-in ends in 1 day\./)).toBeTruthy()
    expect(screen.queryByText(/1 days\./)).toBeNull()
    expect(screen.queryByText(/day.*remain/)).toBeNull()
  })
})
