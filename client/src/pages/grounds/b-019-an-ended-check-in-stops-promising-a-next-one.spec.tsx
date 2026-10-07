import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GroundParticipantPage } from './GroundParticipantPage'
import { GroundAdminPage } from './GroundAdminPage'
import { groundsApi } from '@/api/grounds'
import { reportsApi } from '@/api/reports'

/**
 * B-019: AN ENDED CHECK-IN STILL TOLD THE MEMBER "YOUR NEXT CHECK-IN OPENS ON TUESDAY", AND
 * THE LEAD'S OWN CHECK-IN TAB READ "BRING THIS TO YOUR NEXT CHECK-IN", WITH NO OUTCOME SHOWN.
 *
 * `BetweenCheckIns` is written for a check-in still running, and both the participant's and the
 * lead's own Check-in tab rendered it unconditionally once nothing was open, never checking
 * whether the ground itself had already ended. Fixed by reading `howItEnded(ground)` first and
 * showing that instead, with a way to the board.
 */
vi.mock('@/stores/auth', () => ({
  useAuthStore: (sel: any) => sel({ user: { id: 'u-amani', firstName: 'Amani', lastName: 'Wekesa', email: 'amani@x.test' }, isAuthenticated: true }),
}))
vi.mock('@/api/grounds', () => ({
  groundsApi: { get: vi.fn(), getMySpecificity: vi.fn(), myTranscript: vi.fn(), myNotes: vi.fn() },
}))
vi.mock('@/api/reports', () => ({ reportsApi: { get: vi.fn() } }))
vi.mock('@/api/participantRequests', () => ({ participantRequestsApi: { list: vi.fn().mockResolvedValue([]) } }))
vi.mock('@/api/documents', () => ({ documentsApi: { list: vi.fn() } }))
vi.mock('@/api/resolution', () => ({ resolutionApi: { get: vi.fn().mockResolvedValue(null), propose: vi.fn() } }))
vi.mock('@/api/conversation', () => ({ conversationApi: { remind: vi.fn() } }))
vi.mock('@/api/billing', () => ({ billingApi: { status: vi.fn().mockResolvedValue(null), getContributorCodeShareCard: vi.fn() } }))
const openSpy = vi.fn()
vi.mock('@/hooks/useOpenSession', () => ({
  useOpenSession: () => ({
    open: openSpy, opening: false, openFailed: false, openError: null, retryOpen: vi.fn(),
    paywall: { show: false, close: vi.fn(), freeExtensionAvailable: false, code: '', setCode: vi.fn(), codeMsg: null, setCodeMsg: vi.fn(), redeem: vi.fn(), claimFreeExtension: vi.fn(), createSubscription: vi.fn() },
  }),
}))

function endedGround(over: Record<string, any> = {}) {
  return {
    id: 'g1', label: 'Get a project back on track', scenario: 'DRIFT', status: 'RESOLVED',
    endState: 'STOP', endStateLabel: 'STOP',
    timelineDays: 90, cadence: 'WEEKLY', totalSessions: 6,
    participants: [
      { id: 'p-lead', userId: 'u-rukia', email: 'rukia@x.test', partyType: 'INITIATOR', user: { firstName: 'Rukia', lastName: 'Otieno' } },
      { id: 'p-amani', userId: 'u-amani', email: 'amani@x.test', partyType: 'PARTICIPANT', user: { firstName: 'Amani', lastName: 'Wekesa' } },
    ],
    checkIns: [
      { id: 'c1', participantId: 'p-amani', sessionNumber: 1, status: 'COMPLETED', completedAt: '2026-09-01T10:00:00.000Z' },
    ],
    signals: [],
    boardRenders: true,
    ...over,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  openSpy.mockClear()
  ;(reportsApi.get as any).mockResolvedValue(null)
})

describe('a team member reads that an ended check-in has ended, not a next session', () => {
  it('Amani does not read "Your next check-in opens on" once it has ended', async () => {
    ;(groundsApi.get as any).mockResolvedValue(endedGround())
    ;(groundsApi.getMySpecificity as any).mockResolvedValue(null)
    ;(groundsApi.myTranscript as any).mockResolvedValue({ sessions: [] })
    ;(groundsApi.myNotes as any).mockResolvedValue([])
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/grounds/g1/p?tab=checkin']}>
          <Routes><Route path="/grounds/:id/p" element={<GroundParticipantPage />} /></Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    await screen.findByText(/This check-in has ended/)
    expect(screen.queryByText(/opens on/)).toBeNull()
  })
})

describe('a party reads the same on her own Check-in tab (GroundAdminPage), not a next session', () => {
  it('does not read "Bring this to your next check-in" once it has ended', async () => {
    /* GroundAdminPage is reached only by whoever runs the check-in or an admin, so here Amani
       (the mocked signed-in user above) is its lead - `viewerIsAParty` is still what the fix
       touches, same as for the team member above. */
    ;(groundsApi.get as any).mockResolvedValue(endedGround({
      participants: [
        { id: 'p-lead', userId: 'u-amani', email: 'amani@x.test', partyType: 'INITIATOR', user: { firstName: 'Amani', lastName: 'Wekesa' } },
      ],
      checkIns: [
        { id: 'c1', participantId: 'p-lead', sessionNumber: 1, status: 'COMPLETED', completedAt: '2026-09-01T10:00:00.000Z' },
      ],
      initiatorId: 'u-amani',
    }))
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/grounds/g1?tab=chat']}>
          <Routes><Route path="/grounds/:id" element={<GroundAdminPage />} /></Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    await screen.findByText(/This check-in has ended/)
    expect(screen.queryByText(/next check-in/)).toBeNull()
  })
})

/**
 * B-019, THE SAME FALSE "CLOSED" REFUSAL ONE MORE WAY IN: a ground ended EARLY (the lead stopped
 * it with a session still open) still has a check-in row that is not COMPLETED, so the auto-open
 * effect tried to open it anyway and the server's "This check-in is closed." toasted on top of
 * "This check-in has ended." Both auto-open effects now skip ended grounds outright.
 */
describe('an ended check-in does not also try, and fail, to auto-open a session still in progress', () => {
  it('the participant page does not call open() once the ground has ended', async () => {
    ;(groundsApi.get as any).mockResolvedValue(endedGround({
      checkIns: [
        { id: 'c1', participantId: 'p-amani', sessionNumber: 1, status: 'IN_PROGRESS', completedAt: null },
      ],
    }))
    ;(groundsApi.getMySpecificity as any).mockResolvedValue(null)
    ;(groundsApi.myTranscript as any).mockResolvedValue({ sessions: [] })
    ;(groundsApi.myNotes as any).mockResolvedValue([])
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/grounds/g1/p?tab=checkin']}>
          <Routes><Route path="/grounds/:id/p" element={<GroundParticipantPage />} /></Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    await screen.findByText(/This check-in has ended/)
    expect(openSpy).not.toHaveBeenCalled()
  })

  it('the lead\'s own Check-in tab (GroundAdminPage) does not call open() once the ground has ended', async () => {
    ;(groundsApi.get as any).mockResolvedValue(endedGround({
      participants: [
        { id: 'p-lead', userId: 'u-amani', email: 'amani@x.test', partyType: 'INITIATOR', user: { firstName: 'Amani', lastName: 'Wekesa' } },
      ],
      checkIns: [
        { id: 'c1', participantId: 'p-lead', sessionNumber: 1, status: 'IN_PROGRESS', completedAt: null },
      ],
      initiatorId: 'u-amani',
    }))
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/grounds/g1?tab=chat']}>
          <Routes><Route path="/grounds/:id" element={<GroundAdminPage />} /></Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    await screen.findByText(/This check-in has ended/)
    expect(openSpy).not.toHaveBeenCalled()
  })
})
