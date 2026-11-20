import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GroundAdminPage } from './GroundAdminPage'
import { groundsApi } from '@/api/grounds'
import { reportsApi } from '@/api/reports'

/**
 * "START IT" ON TODAY OPENS THE CHECK-IN IT NAMES (fix plan 16 November, group 9; end-to-end check I-14).
 *
 * The lead has finished her first check-in, so after decision 133 she checks in when she chooses and opening the Check-in tab starts nothing.
 * Today says "Your next check-in for Nakuru win-back" with "Start it", which links to this tab with the check-in named in the address. That was
 * read as "a conversation is named, nothing is opened over it", so the named check-in never opened and the tab showed a box and a small link.
 * Pressing "Start it" is the choosing. The tab opens the one Today points to, and still opens nothing for a lead who just arrives.
 */
const openSpy = vi.fn()
vi.mock('@/hooks/useOpenSession', () => ({
  useOpenSession: () => ({
    open: openSpy,
    opening: false,
    openFailed: false,
    openError: null,
    retryOpen: vi.fn(),
    paywall: { show: false, close: vi.fn(), freeExtensionAvailable: false, code: '', setCode: vi.fn(), codeMsg: null, setCodeMsg: vi.fn(), redeem: vi.fn(), claimFreeExtension: vi.fn(), createSubscription: vi.fn() },
  }),
}))
vi.mock('@/stores/auth', () => ({
  useAuthStore: (sel: any) => sel({ user: { id: 'u-wairimu', firstName: 'Wairimu', lastName: 'Njoroge', email: 'wairimu@x.test' }, isAuthenticated: true }),
}))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn() } }))
vi.mock('@/api/reports', () => ({ reportsApi: { get: vi.fn() } }))
vi.mock('@/api/documents', () => ({ documentsApi: { list: vi.fn().mockResolvedValue([]) } }))
vi.mock('@/api/participantRequests', () => ({ participantRequestsApi: { list: vi.fn().mockResolvedValue([]) } }))
vi.mock('@/api/resolution', () => ({ resolutionApi: { get: vi.fn().mockResolvedValue(null), propose: vi.fn() } }))
vi.mock('@/api/conversation', () => ({ conversationApi: { remind: vi.fn() } }))
vi.mock('@/api/billing', () => ({ billingApi: { status: vi.fn().mockResolvedValue(null), getContributorCodeShareCard: vi.fn() } }))

function theGround() {
  return {
    id: 'g1', label: 'Nakuru win-back', scenario: 'DRIFT', status: 'OPEN',
    timelineDays: 90, cadence: 'WEEKLY', totalSessions: 6, initiatorId: 'u-wairimu',
    participants: [
      { id: 'p-lead', userId: 'u-wairimu', email: 'wairimu@x.test', partyType: 'INITIATOR', user: { firstName: 'Wairimu', lastName: 'Njoroge' } },
    ],
    checkIns: [
      { id: 'c1', participantId: 'p-lead', sessionNumber: 1, status: 'COMPLETED', isSetup: false, availableFrom: '2020-01-01T00:00:00.000Z' },
      { id: 'c2', participantId: 'p-lead', sessionNumber: 2, status: 'NOT_STARTED', availableFrom: '2020-01-02T00:00:00.000Z' },
    ],
    signals: [],
    boardRenders: true,
  }
}

function renderAt(url: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[url]}>
        <Routes><Route path="/grounds/:id" element={<GroundAdminPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  openSpy.mockClear()
  ;(reportsApi.get as any).mockResolvedValue(null)
  ;(groundsApi.get as any).mockResolvedValue(theGround())
})

describe('a lead who presses "Start it" on Today is started, and one who only arrives is not', () => {
  it('opens the check-in named in the address', async () => {
    renderAt('/grounds/g1?tab=chat&c=c2')
    await waitFor(() => expect(openSpy).toHaveBeenCalled())
    expect(openSpy.mock.calls[0][0].id).toBe('c2')
  })

  it('opens nothing when she arrives with no check-in named (she checks in when she chooses)', async () => {
    renderAt('/grounds/g1?tab=chat')
    await screen.findByRole('tab', { name: 'People and setup' })
    expect(openSpy).not.toHaveBeenCalled()
  })

  it('opens nothing over a finished check-in she is reading', async () => {
    renderAt('/grounds/g1?tab=chat&c=c1')
    await screen.findByRole('tab', { name: 'People and setup' })
    expect(openSpy).not.toHaveBeenCalled()
  })
})
