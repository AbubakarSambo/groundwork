import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GroundAdminPage } from './GroundAdminPage'
import { groundsApi } from '@/api/grounds'

/**
 * ONE CLOCK FOR THE SESSION ON THE CHECK-IN'S PAGE (Hafsah, 30 October 2026, first-experience round 1). A clinic lead read
 * "Session 2 of 12. ... Nobody has checked in yet. Waiting for the first session." and a field lead read "You have not
 * checked in for this session yet." on her own row after she had. The header named the server's session (`sessionClock`)
 * while the rows counted the page's own round, and the report fragment said "the first session" whatever the session was.
 * Now the header's count and each row read the server's one session, and nothing calls session 2 the first.
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

/* The lead alone so far, session 1 done, session 2 open and not started: the server's clock names session 2. */
function sessionTwo() {
  return {
    id: 'g1', label: 'Clinic Manager check-in', status: 'ACTIVE', scenario: 'SALES', timelineDays: 84,
    cadence: 'WEEKLY', daysLeft: 80, overdue: 0, initiatorId: 'u-lead',
    report: { id: 'r1', releasedAt: null },
    sessionClock: { currentSession: 2, plannedSessions: 12, says: 'Session 2 of 12.', whileOpen: null },
    participants: [
      { id: 'p-lead', userId: 'u-lead', email: 'lead@x.test', partyType: 'INITIATOR', accepted: true },
    ],
    checkIns: [
      { id: 'c1', sessionNumber: 1, status: 'COMPLETED', participantId: 'p-lead', completedAt: '2027-02-08' },
      { id: 'c2', sessionNumber: 2, status: 'NOT_STARTED', participantId: 'p-lead', availableFrom: '2027-02-15T09:00:00Z' },
    ],
    roundCompletions: [{ sessionNumber: 1 }],
    boardRenders: true,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  ;(groundsApi.get as any).mockResolvedValue(sessionTwo())
})

describe('the check-in page on session 2', () => {
  it('names session 2 once, counts it, and never calls it the first session', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { container } = render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/grounds/g1']}>
          <Routes><Route path="/grounds/:id" element={<GroundAdminPage />} /></Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    await waitFor(() => expect(screen.getAllByText(/Clinic Manager check-in/i).length).toBeGreaterThan(0))
    await waitFor(() => expect(container.textContent).toMatch(/Session 2 of 12\./))
    const text = container.textContent ?? ''
    expect(text).not.toMatch(/Waiting for the first session/i)
    expect(text).not.toMatch(/checked in for session 1\b/)
  })
})

/* Everybody finished session 1 by the page's own count, while the server's clock still names session 1 (it counts who holds the
   clock its own way). The row has to speak of the session the header names. */
function sessionOneByTheClock() {
  return {
    ...sessionTwo(),
    label: 'Farmer Training',
    sessionClock: { currentSession: 1, plannedSessions: 12, says: 'Session 1 of 12.', whileOpen: null },
    participants: [
      { id: 'p-lead', userId: 'u-lead', email: 'lead@x.test', partyType: 'INITIATOR', accepted: true, firstName: 'Akua' },
      { id: 'p-a', userId: 'u-a', email: 'a@x.test', partyType: 'PARTICIPANT', accepted: true, firstName: 'Kwame' },
    ],
    checkIns: [
      { id: 'c1', sessionNumber: 1, status: 'COMPLETED', participantId: 'p-lead', completedAt: '2027-02-08' },
      { id: 'c2', sessionNumber: 1, status: 'COMPLETED', participantId: 'p-a', completedAt: '2027-02-08' },
    ],
    roundCompletions: [],
  }
}

describe('People and setup, on the session the header names', () => {
  it('never tells the lead she has not checked in for this session when she has', async () => {
    ;(groundsApi.get as any).mockResolvedValue(sessionOneByTheClock())
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { container } = render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/grounds/g1?tab=settings']}>
          <Routes><Route path="/grounds/:id" element={<GroundAdminPage />} /></Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    await waitFor(() => expect(screen.getAllByText(/Farmer Training/i).length).toBeGreaterThan(0))
    await waitFor(() => expect(container.textContent).toMatch(/You have checked in for this session\./))
    expect(container.textContent).not.toMatch(/You have not checked in for this session yet/)
  })
})


/*
 * WHO IS IN THE SESSION AND WHO ANSWERED IT, FROM THE SERVER'S ONE COUNT (Hafsah, 30 October 2026, first-experience round 1). A field
 * lead read "all three people have checked in" in Ask, "3 of 5 people have answered this session" on the board, and another count here.
 * The page now counts nothing itself: the header says `thisSession.says`, and "Everyone is in" reads `thisSession.everyoneIn`, so they
 * cannot say something the board and Ask (the same count, api this-sessions-count.spec.ts) do not. The rows on the page here would
 * count differently on purpose (only the lead has a row), and the page still says the served count.
 */
function served(thisSession: any, extra: any = {}) {
  return { ...sessionTwo(), label: 'Field officers', sessionClock: { currentSession: 1, plannedSessions: 12, says: 'Session 1 of 12.', whileOpen: null },
    checkIns: [{ id: 'c1', sessionNumber: 1, status: 'COMPLETED', participantId: 'p-lead', completedAt: '2027-02-08' }], roundCompletions: [], thisSession, ...extra }
}
async function headerOf(g: any) {
  ;(groundsApi.get as any).mockResolvedValue(g)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const { container } = render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds/g1']}>
        <Routes><Route path="/grounds/:id" element={<GroundAdminPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  await waitFor(() => expect(container.textContent).toMatch(/Session 1 of 12\./))
  return container.textContent ?? ''
}

describe('the check-in page says the server\'s one count', () => {
  it('says the served sentence, with who it leaves out, and no count of its own', async () => {
    const says = 'Three of the five people have answered session 1. One of them was invited and has not joined yet.'
    const text = await headerOf(served({ session: 1, answered: 3, ofPeople: 5, everyoneIn: false, notCountedSays: 'One of them was invited and has not joined yet.', says }))
    /* The lead has answered, so the line at the top says it once (B-148), from the same count: two of the five still out. */
    expect(text).toContain('Two of the five have not answered yet. One of them was invited and has not joined yet.')
    expect(text).not.toContain(says)
    expect(text).not.toMatch(/The one person in it|checked in for session 1/)
    expect(text).not.toMatch(/Everyone is in/)
  })

  it('says "Everyone is in" only when the served count says everybody counted has answered', async () => {
    const all = await headerOf(served({ session: 1, answered: 5, ofPeople: 5, everyoneIn: true, notCountedSays: null, says: 'All five people have answered session 1.' }))
    expect(all).toContain('All five people have answered session 1.')
    expect(all).toContain('Everyone is in, report on its way.')
  })

  it('and never from a round the server recorded as done while its count says people are still out', async () => {
    const text = await headerOf(served({ session: 1, answered: 3, ofPeople: 5, everyoneIn: false, notCountedSays: null, says: 'Three of the five people have answered session 1.' }, { roundCompletions: [{ sessionNumber: 1 }] }))
    expect(text).not.toMatch(/Everyone is in/)
  })
})
