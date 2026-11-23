import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GroundAdminPage } from './GroundAdminPage'
import { groundsApi } from '@/api/grounds'

/**
 * B-080: A LEAD WHO ONLY MANAGES READS WHAT SHE DOES, NOT A SESSION COUNT OF HER OWN.
 *
 * Grace runs "Shops reorder in two days" (`HELP_TEAM_UNDERSTAND`, so she is `managingOnly`) and
 * never checks in herself - her one check-in row is the set-up conversation, `isSetup: true`.
 * "Your sessions" on People and setup read "0 of 4 sessions are done." all month, because
 * `sessionsDoneBy` (rightly) never counts a set-up row as a session - so the sentence was built
 * for a person who never answers and never will. She now reads what she does instead.
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
  currentUser = { id: 'u-grace', role: 'ADMIN', email: 'grace@kijani.test' }
})

const groundWithAManagingLead = {
  id: 'g1', label: 'Shops reorder in two days', status: 'ACTIVE', scenario: 'HELP_TEAM_UNDERSTAND',
  timelineDays: 30, cadence: 'FORTNIGHTLY', totalSessions: 4, daysLeft: 25, overdue: 0, initiatorId: 'u-grace',
  participants: [
    { id: 'p-grace', userId: 'u-grace', email: 'grace@kijani.test', partyType: 'INITIATOR', managingOnly: true, user: { firstName: 'Grace', lastName: 'Achieng' } },
    { id: 'p-amani', userId: 'u-amani', email: 'amani@kijani.test', user: { firstName: 'Amani', lastName: 'Wekesa' } },
  ],
  checkIns: [
    { id: 'c-setup', participantId: 'p-grace', sessionNumber: 0, status: 'COMPLETED', isSetup: true },
  ],
  boardRenders: true,
}

describe('a lead who only manages', () => {
  it('reads "You check in when you choose. Use Check in yourself any time.", not "0 of 4 sessions are done."', async () => {
    ;(groundsApi.get as any).mockResolvedValue(groundWithAManagingLead)
    renderPage()
    expect(await screen.findByText('You check in when you choose. Use Check in yourself any time.')).toBeTruthy()
    expect(screen.queryByText(/^You have (not )?checked in for (it|.* sessions|this check-in)/)).toBeNull()
  })

  it('a lead who does check in still reads her own count', async () => {
    ;(groundsApi.get as any).mockResolvedValue({
      ...groundWithAManagingLead,
      scenario: 'SALES',
      participants: [{ ...groundWithAManagingLead.participants[0], managingOnly: false }, groundWithAManagingLead.participants[1]],
    })
    renderPage()
    expect(await screen.findByText(/^You have (not )?checked in for (it|.* sessions|this check-in)/)).toBeTruthy()
    expect(screen.queryByText('You check in when you choose. Use Check in yourself any time.')).toBeNull()
  })
})
