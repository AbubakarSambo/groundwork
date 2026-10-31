import { aServedCount } from '@/lib/a-served-count-for-a-spec'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GroundAdminPage } from './GroundAdminPage'
import { groundsApi } from '@/api/grounds'

/**
 * THE ANCHOR LEAD'S FIRST SCREEN COUNTS ONLY THE PEOPLE WHO CHECK IN (release check, 8 October 2026).
 *
 * On test bed copy a, the first screen after Amina saved "Help my team understand" read: "Session 1 of 4. It ends on
 * 7 November 2026. One of the zero people has checked in for session 1." The anchor's lead does not check in (her row
 * is managing only), so nobody is in session 1 yet, but her own set-up conversation is stored as a finished check-in
 * for session 1, and the count of who has checked in included it. Both numbers now count the same people.
 */
vi.mock('@/stores/auth', () => ({
  useAuthStore: (sel: any) => sel({ user: { id: 'u-amina', role: 'ADMIN', email: 'amina@tamubakes.test' }, isAuthenticated: true }),
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

/* The count is the server's one count now (api this-sessions-count.ts, whose spec pins that the anchor's lead and her set-up
   conversation are left out; Hafsah, 30 October 2026). Each fixture carries it as GET /grounds/:id serves it. */
const anAnchor = (people: any[], checkIns: any[], thisSession: any = { session: 1, answered: 0, ofPeople: 0, everyoneIn: false, notCountedSays: null, says: '' }) => ({
  thisSession,
  id: 'g1', label: 'Help my team understand', status: 'ACTIVE', scenario: 'HELP_TEAM_UNDERSTAND', timelineDays: 30,
  cadence: 'WEEKLY', plannedSessions: 4, daysLeft: 30, overdue: 0, initiatorId: 'u-amina', endsOn: '2026-11-07',
  participants: [
    { id: 'p-amina', userId: 'u-amina', email: 'amina@tamubakes.test', partyType: 'INITIATOR', accepted: true, managingOnly: true },
    ...people,
  ],
  checkIns: [
    /* Her set-up conversation, stored as a finished session 1. */
    { id: 'c-setup', sessionNumber: 1, status: 'COMPLETED', participantId: 'p-amina', completedAt: '2026-10-08' },
    ...checkIns,
  ],
  sessionClock: { currentSession: 1, plannedSessions: 4, says: 'Session 1 of 4.', whileOpen: null },
  boardRenders: true,
  /* As the server counts it: the anchor's managing lead is never in a round; her team is, and a finished session is an answer. */
  answeredBySession: aServedCount({ 1: {
    on: people.map((p) => p.id),
    answered: checkIns.filter((c) => c.status === 'COMPLETED').map((c) => c.participantId),
  } }),
})

describe("the anchor lead's first screen", () => {
  it('never says one of zero people has checked in when nobody checks in yet', async () => {
    ;(groundsApi.get as any).mockResolvedValue(anAnchor([], []))
    renderPage()
    expect(await screen.findByText(/Session 1 of 4\./)).toBeTruthy()
    expect(screen.queryByText(/of the zero people/)).toBeNull()
    expect(screen.queryByText(/checked in for session 1/)).toBeNull()
  })

  it('counts her team, not her, once two of them are in and one has answered', async () => {
    const team = [
      { id: 'p-juma', userId: 'u-juma', email: 'juma@tamubakes.test', partyType: 'PARTICIPANT', accepted: true },
      { id: 'p-wanja', userId: 'u-wanja', email: 'wanja@tamubakes.test', partyType: 'PARTICIPANT', accepted: true },
    ]
    ;(groundsApi.get as any).mockResolvedValue(anAnchor(team, [
      { id: 'c-juma', sessionNumber: 1, status: 'COMPLETED', participantId: 'p-juma', completedAt: '2026-10-09' },
    ], { session: 1, answered: 1, ofPeople: 2, everyoneIn: false, notCountedSays: null, says: 'One of the two people has checked in for session 1.' }))
    renderPage()
    await waitFor(() => expect(screen.getAllByText(/Help my team understand/i).length).toBeGreaterThan(0))
    expect(await screen.findByText(/One of the two people has checked in for session 1\./)).toBeTruthy()
    expect(screen.queryByText(/Two of the two people/)).toBeNull()
  })
})
