import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GroundAdminPage } from './GroundAdminPage'
import { groundsApi } from '@/api/grounds'

/**
 * COORDINATOR FOLLOW-UP TO B-100: "YOUR CHECK-IN" IS A DOOR TO A CHECK-IN SHE DOES NOT DO.
 *
 * Every count on My work and the Check-ins tab now leaves a lead who only manages
 * (`managingOnly`) out, same rule as B-077/B-078/B-080. The "Check-in" tab and the header's
 * "Your check-in" button were still offered to her though - both lead to the same place
 * (`GroundAdminPage`'s `chat` tab), which has nothing of hers to show. Fixed with the same
 * `managingOnly` exclusion, named `viewerChecksIn` (`viewerIsAParty && !managingOnly`) where the
 * tab row and the header button ask whether to offer it.
 *
 * A lead who does check in is unaffected - she keeps both.
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
      {/* ?tab=sessions opens People and setup now (page audit, 24 November 2026, row 8), which has no header button; My work does. */}
      <MemoryRouter initialEntries={['/grounds/g1?tab=record']}>
        <Routes><Route path="/grounds/:id" element={<GroundAdminPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  currentUser = { id: 'u-baraka', role: 'ADMIN', email: 'baraka@msingi.test' }
})

const groundWithAManagingLead = {
  id: 'g1', label: 'Help my team understand', status: 'ACTIVE', scenario: 'HELP_TEAM_UNDERSTAND',
  timelineDays: 30, cadence: 'WEEKLY', totalSessions: 4, daysLeft: 25, overdue: 0, initiatorId: 'u-baraka',
  participants: [
    { id: 'p-baraka', userId: 'u-baraka', email: 'baraka@msingi.test', partyType: 'INITIATOR', managingOnly: true, user: { firstName: 'Baraka', lastName: 'Mutua' } },
    { id: 'p-halima', userId: 'u-halima', email: 'halima@msingi.test', user: { firstName: 'Halima', lastName: 'Yusuf' } },
  ],
  checkIns: [
    { id: 'c-setup', participantId: 'p-baraka', sessionNumber: 1, status: 'COMPLETED', isSetup: true, completedAt: '2026-10-01T00:00:00Z' },
  ],
  report: { releasedAt: null },
  boardRenders: true,
}

describe('a lead who only manages: no "Your check-in" tab or header button', () => {
  it('has neither the "Check-in" tab nor the "Your check-in" header button', async () => {
    ;(groundsApi.get as any).mockResolvedValue(groundWithAManagingLead)
    renderPage()
    await screen.findByText('My work')
    expect(screen.queryByText('Check-in')).toBeNull()
    expect(screen.queryByText('Your check-in')).toBeNull()
  })

  it('a lead who does check in keeps both', async () => {
    ;(groundsApi.get as any).mockResolvedValue({
      ...groundWithAManagingLead,
      scenario: 'SALES',
      participants: [
        { ...groundWithAManagingLead.participants[0], managingOnly: false },
        groundWithAManagingLead.participants[1],
      ],
    })
    renderPage()
    await screen.findByText('My work')
    expect(screen.getByText('Check-in')).toBeTruthy()
    expect(screen.getByText('Your check-in')).toBeTruthy()
  })
})
