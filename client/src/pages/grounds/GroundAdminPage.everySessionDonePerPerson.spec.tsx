import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GroundAdminPage } from './GroundAdminPage'
import { groundsApi } from '@/api/grounds'

/**
 * FAULT 2: "EVERY SESSION DONE" IN SESSION 1 OF 6.
 *
 * On the lead's people-and-sessions list, a person's row read "Every session done" as soon as
 * their one existing check-in row was COMPLETED, even though the check-in plans six sessions and
 * five have not happened yet. `allDone` looked only at the rows that already exist - a row that
 * has not been created yet cannot fail an `.every()` check. A person is "every session done" only
 * when their completed count reaches the planned total, or the check-in has ended.
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

function groundOneOfSix(status = 'ACTIVE') {
  return {
    id: 'g1', label: 'Esther - Quarterly', status, scenario: 'SALES', timelineDays: 180,
    cadence: 'WEEKLY', totalSessions: 6, daysLeft: 170, overdue: 0, initiatorId: 'u-lead',
    participants: [
      { id: 'p-lead', userId: 'u-lead', email: 'lead@x.test', partyType: 'INITIATOR', accepted: true },
      { id: 'p-esther', userId: 'u-esther', email: 'esther@x.test', partyType: 'PARTICIPANT', accepted: true },
    ],
    checkIns: [
      // Esther has finished only session 1 of the planned 6; nothing else exists yet.
      { id: 'c1', sessionNumber: 1, status: 'COMPLETED', participantId: 'p-esther', completedAt: '2026-09-01' },
    ],
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

beforeEach(() => {
  vi.clearAllMocks()
})

describe('a person is "every session done" only when there is nothing still to come', () => {
  it('does not say Esther is done after only session 1 of 6', async () => {
    ;(groundsApi.get as any).mockResolvedValue(groundOneOfSix())
    renderPage()
    await waitFor(() => expect(screen.getAllByText(/Esther - Quarterly/i).length).toBeGreaterThan(0))
    await waitFor(() => expect(screen.queryByText('Every check-in done')).toBeNull())
  })

  it('still says somebody is done once their completed count reaches the planned total', async () => {
    const g = groundOneOfSix()
    g.checkIns = Array.from({ length: 6 }, (_, i) => ({
      id: `c${i + 1}`, sessionNumber: i + 1, status: 'COMPLETED', participantId: 'p-esther', completedAt: '2026-09-01',
    }))
    ;(groundsApi.get as any).mockResolvedValue(g)
    renderPage()
    /* Changed (page audit, 24 November 2026, rows 2 and 8): a row's status is said once, by its sentence, so the "Every check-in done"
       label went; each of her six check-ins reads as done on its own dot instead. */
    await waitFor(() => expect(screen.getAllByText(/Esther - Quarterly/i).length).toBeGreaterThan(0))
    await waitFor(() => expect(screen.getAllByLabelText(/^Check-in \d: completed/).length).toBe(6))
  })
})
