import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GroundAdminPage } from './GroundAdminPage'
import { groundsApi } from '@/api/grounds'

/**
 * B-009: "WAITING FOR AN ADMIN TO ACCEPT THIS CHECK-IN. YOU CAN KEEP EDITING IT…" AND
 * "THIS CHECK-IN IS CLOSED. NOTHING FURTHER CAN BE ADDED." SHOWED TOGETHER, SAYING OPPOSITE
 * THINGS, on the lead's own Check-in tab right after saving, before an admin approves it.
 *
 * The Check-in tab tried to auto-open the lead's own session regardless of the ground's status.
 * While AWAITING_APPROVAL, the server refuses that open with its own "closed" sentence (written
 * for a check-in that has actually ended), and that refusal banner then sat directly under the
 * waiting callout. Nothing can open until an admin accepts it, so the open attempt must wait.
 */
const openMySession = vi.fn()
vi.mock('@/hooks/useOpenSession', () => ({
  useOpenSession: () => ({
    open: openMySession,
    opening: false,
    openFailed: false,
    openError: null,
    retryOpen: vi.fn(),
    paywall: { show: false, close: vi.fn(), freeExtensionAvailable: false, code: '', setCode: vi.fn(), codeMsg: null, setCodeMsg: vi.fn(), redeem: vi.fn(), claimFreeExtension: vi.fn(), createSubscription: vi.fn() },
  }),
}))
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
      <MemoryRouter initialEntries={['/grounds/g1?tab=chat']}>
        <Routes><Route path="/grounds/:id" element={<GroundAdminPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  currentUser = { id: 'u-leo', role: 'MEMBER', email: 'leo@x.test' }
})

describe('a check-in awaiting approval does not also try, and fail, to open', () => {
  it('does not call the open-session hook while an admin has not yet accepted it', async () => {
    ;(groundsApi.get as any).mockResolvedValue({
      id: 'g1', label: 'Noor, onboarding', status: 'AWAITING_APPROVAL', scenario: 'ONBOARDING',
      timelineDays: 90, cadence: 'WEEKLY', totalSessions: 12, initiatorId: 'u-leo',
      participants: [
        { id: 'p-lead', userId: 'u-leo', email: 'leo@x.test', partyType: 'INITIATOR', user: { firstName: 'Leo' } },
      ],
      checkIns: [
        { id: 'c1', participantId: 'p-lead', sessionNumber: 1, status: 'NOT_STARTED', availableFrom: '2026-09-01T00:00:00.000Z' },
      ],
      boardRenders: true,
    })
    renderPage()
    await screen.findByText('Waiting for an admin to accept this check-in')
    expect(openMySession).not.toHaveBeenCalled()
  })
})
