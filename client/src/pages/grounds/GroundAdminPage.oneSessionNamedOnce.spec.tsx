import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GroundAdminPage } from './GroundAdminPage'
import { aServedCount } from '@/lib/a-served-count-for-a-spec'
import { groundsApi } from '@/api/grounds'

/**
 * B-053: ONE LINE, ONE SESSION. The final browser run (8 October) found the header reading "Session
 * 1 of 12. It ends on 23 December 2026. Nobody has checked in yet. Waiting for the first
 * check-in." after Tendai (the only person who checks in on this ground) had finished session 1 -
 * the report row already said "1 of 1 checked in", People and setup said "1 of 12 sessions are
 * done", and the board said the session was done. `ground.sessionClock.says` named session 1 (the
 * server's own round), while the header counted "who has checked in" against this page's own
 * `openRound`, which had already moved on to session 2 - a session nobody had answered yet because
 * it had only just opened. Two different sessions, read as one line.
 *
 * Fixed by counting "who has checked in" (and whether a report is being written) against the same
 * round `sessionClock.says` names, not this page's own count, whenever the server sends a clock.
 */
vi.mock('@/stores/auth', () => ({
  useAuthStore: (sel: any) => sel({ user: { id: 'u-lead', role: 'MEMBER', email: 'tendai@kijani.test' }, isAuthenticated: true }),
}))
vi.mock('@/api/participantRequests', () => ({ participantRequestsApi: { list: vi.fn().mockResolvedValue([]) } }))
vi.mock('@/api/reports', () => ({ reportsApi: { get: vi.fn() } }))
vi.mock('@/api/documents', () => ({ documentsApi: { list: vi.fn() } }))
vi.mock('@/api/resolution', () => ({ resolutionApi: { get: vi.fn().mockResolvedValue(null), propose: vi.fn() } }))
vi.mock('@/api/conversation', () => ({ conversationApi: { remind: vi.fn() } }))
vi.mock('@/api/billing', () => ({ billingApi: { status: vi.fn().mockResolvedValue(null), getContributorCodeShareCard: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn() } }))

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

beforeEach(() => vi.clearAllMocks())

describe('B-053: the header names one session, and counts who has checked in for that same session', () => {
  it('does not say "nobody has checked in yet" once the session the server names has been finished', async () => {
    const g = {
      id: 'g1', label: 'Get a project back on track', status: 'ACTIVE', scenario: 'PROJECT', timelineDays: 360,
      cadence: 'MONTHLY', plannedSessions: 12, daysLeft: 76, overdue: 0, initiatorId: 'u-lead',
      endsOn: '2026-12-23',
      participants: [
        { id: 'p-lead', userId: 'u-lead', email: 'tendai@kijani.test', partyType: 'INITIATOR', accepted: true },
      ],
      checkIns: [
        { id: 'c1', sessionNumber: 1, status: 'COMPLETED', participantId: 'p-lead', completedAt: '2026-10-07' },
      ],
      report: { id: 'r1' },
      /* The server's own clock still names session 1 ("1 of 12 sessions done"), while this page's own
         `openRound` has already moved to session 2, which nobody has answered - the exact split that
         produced the bug. */
      sessionClock: { currentSession: 1, plannedSessions: 12, says: 'Session 1 of 12.', whileOpen: null },
      /* The count for that same session, from the server's one count (api grounds/the-count-as-served.ts; Hafsah, 30 October 2026). Changed 3 November (F1 part 2): one served count, theCount, in place of `thisSession` beside `answeredBySession`; the same sentences. */
      boardRenders: true,
      theCount: aServedCount({ 1: { on: ['p-lead'], answered: ['p-lead'] }, 2: { on: [], answered: [] } }, { session: 1, everyoneIn: true, says: 'The one person in it has checked in for session 1.' }),
    }
    ;(groundsApi.get as any).mockResolvedValue(g)
    renderPage()
    await waitFor(() => expect(screen.getAllByText(/Get a project back on track/i).length).toBeGreaterThan(0))

    expect(await screen.findByText(/Session 1 of 12\./)).toBeTruthy()
    // One session, one true statement: the session just named has been checked into.
    expect(await screen.findByText(/has checked in for session 1\./)).toBeTruthy()
    expect(screen.queryByText(/Nobody has checked in yet/)).toBeNull()
    expect(screen.queryByText(/Waiting for the first check-in/)).toBeNull()
  })
})
