import { aServedCount } from '@/lib/a-served-count-for-a-spec'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GroundAdminPage } from './GroundAdminPage'
import { groundsApi } from '@/api/grounds'

/**
 * "REPORT BEING WRITTEN." NEVER CLEARED ON THE CHECK-IN'S OWN PAGE (staging test, 15 October 2026). Hafsah checked in on
 * Drop Access's sales check-in; three people she invited had not yet. The report written from her answers was already
 * on the page, and the header said "Report being written." for as long as the others had not answered.
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

function ground() {
  return {
    id: 'g1', label: 'Drop Access sales', status: 'ACTIVE', scenario: 'SALES', timelineDays: 90,
    cadence: 'DAILY', daysLeft: 80, overdue: 0, initiatorId: 'u-lead',
    report: { id: 'r1', releasedAt: null },
    participants: [
      { id: 'p-lead', userId: 'u-lead', email: 'lead@x.test', partyType: 'INITIATOR', accepted: true },
      { id: 'p-a', userId: 'u-a', email: 'a@x.test', partyType: 'PARTICIPANT', accepted: true },
      { id: 'p-b', userId: 'u-b', email: 'b@x.test', partyType: 'PARTICIPANT', accepted: true },
    ],
    checkIns: [
      { id: 'c1', sessionNumber: 1, status: 'COMPLETED', participantId: 'p-lead', completedAt: '2026-10-15' },
      { id: 'c2', sessionNumber: 1, status: 'OPEN', participantId: 'p-a' },
      { id: 'c3', sessionNumber: 1, status: 'OPEN', participantId: 'p-b' },
    ],
    roundCompletions: [],
    /* The server's one count (api this-sessions-count.ts; Hafsah, 30 October 2026): Hafsah answered, the two she invited have not. */
    thisSession: { session: 1, answered: 1, ofPeople: 3, everyoneIn: false, notCountedSays: null, says: 'One of the three people has checked in for session 1.' },
    boardRenders: true,
    answeredBySession: aServedCount({ 1: { on: ['p-lead', 'p-a', 'p-b'], answered: ['p-lead'] } }),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  ;(groundsApi.get as any).mockResolvedValue(ground())
})

describe('the header, while some have answered and others have not', () => {
  it('says the report so far is ready to read, not that it is being written', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/grounds/g1']}>
          <Routes><Route path="/grounds/:id" element={<GroundAdminPage />} /></Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    await waitFor(() => expect(screen.getAllByText(/Drop Access sales/i).length).toBeGreaterThan(0))
    expect(await screen.findByText(/The report so far is ready to read, and it fills in as the others check in\./)).toBeTruthy()
    expect(screen.queryByText(/Report being written\./)).toBeNull()
  })
})
