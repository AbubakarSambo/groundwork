import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GroundAdminPage } from './GroundAdminPage'
import { groundsApi } from '@/api/grounds'

/**
 * GROUP 3'S REVIEW, THE SCREEN'S OWN SENTENCES 12: A LINK IS NOT THE LAST WORD OF A SENTENCE.
 *
 * The header's own session line ended "...Nothing anybody wrote is lost. How to run one", with the
 * link run straight on from the sentence before it, in the same paragraph. The link is now its own
 * short line, below the sentence, reading "Read how to run one".
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

function ground(over: Record<string, any> = {}) {
  return {
    id: 'g1', label: 'Sales team, Q3', status: 'ACTIVE', scenario: 'SALES', timelineDays: 90, cadence: 'WEEKLY',
    daysLeft: 72, overdue: 0, initiatorId: 'u-rukia',
    participants: [
      { id: 'p-rukia', userId: 'u-rukia', email: 'rukia@x.test', partyType: 'INITIATOR', user: { firstName: 'Rukia', lastName: 'Otieno' } },
      { id: 'p-amani', userId: 'u-amani', email: 'amani@x.test', partyType: 'PARTICIPANT', user: { firstName: 'Amani', lastName: 'Wekesa' } },
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
      <MemoryRouter initialEntries={['/grounds/g1?tab=chat']}>
        <Routes><Route path="/grounds/:id" element={<GroundAdminPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  ;(groundsApi.get as any).mockResolvedValue(ground())
})

describe('the lead\'s header, before anybody has finished a session', () => {
  it('reads "Read how to run one" as its own line, not run on from the sentence above it', async () => {
    renderPage()
    const link = await screen.findByRole('link', { name: 'Read how to run one' })
    expect(link.getAttribute('href')).toBe('/org/guide')
    // The link's own paragraph holds nothing but the link - the sentence above it is a sibling, not a parent.
    expect(link.parentElement?.textContent).toBe('Read how to run one')
  })
})
