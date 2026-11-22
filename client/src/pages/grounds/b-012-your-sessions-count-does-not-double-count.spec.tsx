import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GroundAdminPage } from './GroundAdminPage'
import { groundsApi } from '@/api/grounds'

/**
 * B-012: "Your sessions: 9 of 6 sessions are done." on a check-in six sessions long that had had
 * exactly one session (session 1) answered once. `mySessionsDone` counted completed ROWS, and a
 * self-correction leaves a second COMPLETED row for the same session number (the same defect class
 * as a-self-correction-does-not-inflate-your-session.spec.tsx, there for the participant's "This is
 * your session N of M."). Here it is the lead's own People and setup tab. Fixed by counting the
 * distinct session numbers, and by clamping `yourSessionsSentence` so it can never read more done
 * than planned regardless of how the count arrived.
 */
let currentUser: { id: string; role: string; email: string }
vi.mock('@/stores/auth', () => ({
  useAuthStore: (sel: any) => sel({ user: currentUser, isAuthenticated: true }),
}))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn() } }))
vi.mock('@/api/participantRequests', () => ({ participantRequestsApi: { list: vi.fn().mockResolvedValue([]) } }))
vi.mock('@/api/reports', () => ({ reportsApi: { get: vi.fn() } }))
vi.mock('@/api/documents', () => ({ documentsApi: { list: vi.fn() } }))
vi.mock('@/api/resolution', () => ({ resolutionApi: { get: vi.fn().mockResolvedValue(null), propose: vi.fn() } }))
vi.mock('@/api/conversation', () => ({ conversationApi: { remind: vi.fn() } }))
vi.mock('@/api/billing', () => ({ billingApi: { status: vi.fn().mockResolvedValue(null), getContributorCodeShareCard: vi.fn() } }))

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds/g1?tab=settings']}>
        <Routes><Route path="/grounds/:id" element={<GroundAdminPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  currentUser = { id: 'u-rukia', role: 'ADMIN', email: 'rukia@x.test' }
})

describe('"Your sessions" never reads more sessions done than are planned', () => {
  it('a self-correction on session 1 does not read "9 of 6 sessions are done"', async () => {
    ;(groundsApi.get as any).mockResolvedValue({
      id: 'g1', label: 'Sales team, Q3', status: 'ACTIVE', scenario: 'SALES', timelineDays: 90,
      cadence: 'FORTNIGHTLY', totalSessions: 6, daysLeft: 40, overdue: 0, initiatorId: 'u-rukia',
      participants: [
        { id: 'p-lead', userId: 'u-rukia', email: 'rukia@x.test', partyType: 'INITIATOR', user: { firstName: 'Rukia', lastName: 'Otieno' } },
      ],
      /* Session 1 completed, then self-corrected: two COMPLETED rows, one session actually done. */
      checkIns: [
        { id: 'c1', participantId: 'p-lead', sessionNumber: 1, status: 'COMPLETED', completedAt: '2026-09-01T10:00:00.000Z', isSelfCorrection: false },
        { id: 'c1b', participantId: 'p-lead', sessionNumber: 1, status: 'COMPLETED', completedAt: '2026-09-01T11:00:00.000Z', isSelfCorrection: true },
      ],
      boardRenders: true,
    })
    renderPage()
    expect(await screen.findByText('You have checked in for 1 of the 6 sessions.')).toBeTruthy()
    expect(screen.queryByText(/of the 6 sessions/)?.textContent).not.toMatch(/for 9 of/)
  })
})
