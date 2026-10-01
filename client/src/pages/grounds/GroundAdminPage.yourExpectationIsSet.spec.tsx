import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GroundAdminPage } from './GroundAdminPage'
import { groundsApi } from '@/api/grounds'

/**
 * GROUP 3'S REVIEW, THE SCREEN'S OWN SENTENCES 10: ON THE READER'S OWN ROW, "THEY" IS HER.
 *
 * Rukia leads her own check-in and is also a participant in it. The Sessions roster read
 * "Expectation set. They have seen it." about her own row, a third person about the reader
 * herself. It now reads "Your expectation is set. You have seen it." on her own row; everybody
 * else's row is unchanged.
 */
vi.mock('@/stores/auth', () => ({
  useAuthStore: (sel: any) => sel({ user: { id: 'u-rukia', role: 'MEMBER', email: 'rukia@x.test' }, isAuthenticated: true }),
}))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn() } }))
vi.mock('@/api/participantRequests', () => ({ participantRequestsApi: { list: vi.fn().mockResolvedValue([]) } }))
vi.mock('@/api/reports', () => ({ reportsApi: { get: vi.fn() } }))
vi.mock('@/api/documents', () => ({ documentsApi: { list: vi.fn() } }))
vi.mock('@/api/resolution', () => ({ resolutionApi: { get: vi.fn().mockResolvedValue(null), propose: vi.fn() } }))
vi.mock('@/api/conversation', () => ({ conversationApi: { remind: vi.fn() } }))
vi.mock('@/api/billing', () => ({ billingApi: { status: vi.fn().mockResolvedValue(null), getContributorCodeShareCard: vi.fn() } }))

function ground() {
  return {
    id: 'g1', label: 'Sales team, Q3', status: 'ACTIVE', scenario: 'SALES', timelineDays: 90, cadence: 'WEEKLY',
    daysLeft: 72, overdue: 0, initiatorId: 'u-rukia',
    participants: [
      {
        id: 'p-rukia', userId: 'u-rukia', email: 'rukia@x.test', partyType: 'INITIATOR',
        user: { firstName: 'Rukia', lastName: 'Otieno' },
        objective: { text: 'Sign 4 shops.', seenBySubject: true, all: [] },
        checkIns: [{ id: 'c1', sessionNumber: 1, status: 'COMPLETED' }],
      },
      {
        id: 'p-amani', userId: 'u-amani', email: 'amani@x.test', partyType: 'PARTICIPANT',
        user: { firstName: 'Amani', lastName: 'Wekesa' },
        objective: { text: 'Sign 3 shops.', seenBySubject: true, all: [] },
        checkIns: [{ id: 'c2', sessionNumber: 1, status: 'COMPLETED' }],
      },
    ],
    checkIns: [
      { id: 'c1', participantId: 'p-rukia', sessionNumber: 1, status: 'COMPLETED', completedAt: '2026-09-27' },
      { id: 'c2', participantId: 'p-amani', sessionNumber: 1, status: 'COMPLETED', completedAt: '2026-09-27' },
    ],
    boardRenders: true,
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
  ;(groundsApi.get as any).mockResolvedValue(ground())
})

describe('the Sessions roster, on the reader\'s own row', () => {
  it('Rukia reads "Your expectation is set. You have seen it." about herself, and "Expectation set. They have seen it." about Amani', async () => {
    renderPage()
    expect(await screen.findByText('Your expectation is set. You have seen it.')).toBeTruthy()
    expect(await screen.findByText('Expectation set. They have seen it.')).toBeTruthy()
  })
})
