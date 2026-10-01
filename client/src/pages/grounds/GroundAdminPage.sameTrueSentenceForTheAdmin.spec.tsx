import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GroundAdminPage } from './GroundAdminPage'
import { groundsApi } from '@/api/grounds'

/**
 * GROUP 3'S REVIEW, CONTRADICTION 3: ONE TRUE SENTENCE, NOT TWO DIFFERENT ONES, FOR THE SAME FACT.
 *
 * Rukia is an admin of her own organisation. On the Sessions roster this page told her "Waiting on
 * your organisation. An admin there has to let them in." about Faraji - true of a lead who is NOT
 * an admin, false of her: she is the admin it is waiting on. People and setup's own roster
 * (WhosInItRoster.tsx) already told her the true thing about herself, "You can let Faraji Odhiambo
 * in on People." This pins the Sessions roster to the same check (`isOrgAdmin`) and the same words.
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

function groundWithSomebodyWaitingOnAnAdmin(over: Record<string, any> = {}) {
  return {
    id: 'g1', label: 'Sales team, Q3', status: 'ACTIVE', scenario: 'SALES', timelineDays: 90, cadence: 'FORTNIGHTLY',
    daysLeft: 40, overdue: 0, initiatorId: 'u-rukia',
    participants: [
      { id: 'p-lead', userId: 'u-rukia', email: 'rukia@x.test', partyType: 'INITIATOR', user: { firstName: 'Rukia', lastName: 'Otieno' } },
      { id: 'p-faraji', userId: 'u-faraji', email: 'faraji@x.test', partyType: 'PARTICIPANT', user: { firstName: 'Faraji', lastName: 'Odhiambo', awaitingOrgApproval: true } },
    ],
    checkIns: [],
    boardRenders: true,
    ...over,
  }
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds/g1?tab=checkins']}>
        <Routes><Route path="/grounds/:id" element={<GroundAdminPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  ;(groundsApi.get as any).mockResolvedValue(groundWithSomebodyWaitingOnAnAdmin())
})

describe('the same true sentence, for whoever is actually the admin', () => {
  it('Rukia, who is an admin, reads "You can let Faraji Odhiambo in on People."', async () => {
    currentUser = { id: 'u-rukia', role: 'ADMIN', email: 'rukia@x.test' }
    renderPage()
    expect(await screen.findByText('You can let Faraji Odhiambo in on People.')).toBeTruthy()
    expect(screen.queryByText(/Waiting on your organisation/)).toBeNull()
  })

  it('a lead who is not an admin reads "Waiting on your organisation. An admin there has to let them in."', async () => {
    currentUser = { id: 'u-rukia', role: 'MEMBER', email: 'rukia@x.test' }
    renderPage()
    expect(await screen.findByText('Waiting on your organisation. An admin there has to let them in.')).toBeTruthy()
    expect(screen.queryByText(/You can let Faraji Odhiambo in on People/)).toBeNull()
  })
})
