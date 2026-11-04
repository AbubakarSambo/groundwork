import { aServedCount } from '@/lib/a-served-count-for-a-spec'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GroundAdminPage } from './GroundAdminPage'
import { groundsApi } from '@/api/grounds'

/**
 * SCREEN FAULT 4 (FINAL WALK): "1 OF THE 3 HAVE NOT ANSWERED YET." IS NOW IN WORDS.
 *
 * The lead's own attention line used to read a bare fraction with the wrong verb for one person
 * left over - "1 of the 3 have not answered yet.". Numbers up to ten are said in words elsewhere on
 * the product (stillToCheckIn, WhoIsStillOut); this is the same rule applied here, with "has" for
 * one person and "have" for more than one (a-number-up-to-ten-in-words.ts).
 */
vi.mock('@/stores/auth', () => ({
  useAuthStore: (sel: any) => sel({ user: { id: 'u-lead', role: 'MEMBER', email: 'lead@x.test' }, isAuthenticated: true }),
}))
vi.mock('@/api/participantRequests', () => ({ participantRequestsApi: { list: vi.fn().mockResolvedValue([]) } }))
vi.mock('@/api/reports', () => ({ reportsApi: { get: vi.fn().mockResolvedValue(null) } }))
vi.mock('@/api/documents', () => ({ documentsApi: { list: vi.fn().mockResolvedValue([]) } }))
vi.mock('@/api/resolution', () => ({ resolutionApi: { get: vi.fn().mockResolvedValue(null), propose: vi.fn() } }))
vi.mock('@/api/conversation', () => ({ conversationApi: { remind: vi.fn() } }))
vi.mock('@/api/billing', () => ({ billingApi: { status: vi.fn().mockResolvedValue(null), getContributorCodeShareCard: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn() } }))

function ground() {
  return {
    id: 'g1', label: 'Sales team, Q3', status: 'ACTIVE', scenario: 'SALES', timelineDays: 90,
    cadence: 'FORTNIGHTLY', daysLeft: 10, overdue: 0, initiatorId: 'u-lead',
    report: null,
    participants: [
      { id: 'p-lead', userId: 'u-lead', email: 'lead@x.test', partyType: 'INITIATOR', accepted: true },
      { id: 'p-a', userId: 'u-a', email: 'a@x.test', partyType: 'PARTICIPANT', accepted: true },
      { id: 'p-b', userId: 'u-b', email: 'b@x.test', partyType: 'PARTICIPANT', accepted: true },
    ],
    /* The lead and one colleague have checked in for session 1; one has not - "one of the three". */
    checkIns: [
      { id: 'c1', sessionNumber: 1, status: 'COMPLETED', participantId: 'p-lead', completedAt: '2026-09-23' },
      { id: 'c2', sessionNumber: 1, status: 'COMPLETED', participantId: 'p-a', completedAt: '2026-09-23' },
      { id: 'c3', sessionNumber: 1, status: 'NOT_STARTED', participantId: 'p-b' },
    ],
    roundCompletions: [],
    /* The server's one count for the session (api this-sessions-count.ts; Hafsah, 30 October 2026): the lead answered, so she counts. */
    /* Changed 3 November (F1 part 2): one served count, theCount, in place of `thisSession` beside `answeredBySession`; the same sentences. */
    boardRenders: true,
    theCount: aServedCount({ 1: { on: ['p-lead', 'p-a', 'p-b'], answered: ['p-lead', 'p-a'] } }, { session: 1, says: '2 of 3 have checked in; Ben hasn’t started yet.' }),
  }
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds/g1']}>
        <Routes><Route path="/grounds/:id" element={<GroundAdminPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  ;(groundsApi.get as any).mockResolvedValue(ground())
})

/*
 * Changed 3 November (F5 part 3): the attention line's own count ("One of the three has not answered yet.") is gone. The page says
 * the server's one count sentence (api grounds/this-sessions-count.ts), the same words Today, the board, the list and Ask say, once.
 */
describe('the lead’s attention line, when one of the team has not answered yet', () => {
  it('says the served sentence, with who is missing, not a fraction', async () => {
    const { container } = renderPage()
    await waitFor(() => expect(screen.getAllByText(/Sales team, Q3/i).length).toBeGreaterThan(0))
    await waitFor(() => expect(container.textContent).toContain('2 of 3 have checked in; Ben hasn’t started yet.'))
    expect(container.textContent).not.toMatch(/1 of the 3|has not answered yet/)
  })

  /* B-148: the same fact is said once, never in two wordings on one page. */
  it('says it once (B-148)', async () => {
    const { container } = renderPage()
    await waitFor(() => expect(container.textContent).toContain('2 of 3 have checked in'))
    expect(container.textContent!.split('2 of 3 have checked in').length - 1).toBe(1)
  })
})
