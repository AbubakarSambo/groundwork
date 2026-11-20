import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GroundAdminPage } from './GroundAdminPage'
import { GroundParticipantPage } from './GroundParticipantPage'
import { groundsApi } from '@/api/grounds'

/**
 * THE CHECK-IN TAB IS THE CONVERSATION (batch 2, group 5; Hafsah, 3 and 4 November, items 3b, 42 and 53).
 *
 * The Check-in tab used to be a page in between: "Session 2 of 12. Three of the five people have checked in for session 2.",
 * "See what each person said", "Read how to run one", "Your turn.", the report's state, "It went back to session 2…",
 * "Check in yourself", "Add context" and a list of sessions. Now it draws the conversation: an open one ready to type, or the
 * last one with one quiet line about the next and the box to add something, and the tabs stay on screen.
 *
 * REPLACES ten specs that pinned that session line on this tab: GroundAdminPage.notLetInYetDoesNotStallTheHeader,
 * GroundAdminPage.oneSessionNamedOnce, GroundAdminPage.reportStateAgreesWithStatus, GroundAdminPage.roundWentBack,
 * GroundAdminPage.theGuideLinkIsItsOwnLine, the-anchor-leads-first-screen-counts-only-who-checks-in,
 * the-header-draws-the-servers-session-clock, the-report-so-far-is-ready-while-others-answer, the-session-lines-read-one-clock
 * and the-waiting-line-is-in-words. The server's one count they protected is said on the board (BoardPage, `theCountSays`),
 * pinned by the board's own specs (the-board-as-each-reader-reads-it, the-active-line); the header keeps "Session N of M".
 */
let me: any = { id: 'u-lead', role: 'MEMBER', firstName: 'Akua', email: 'lead@x.test' }
vi.mock('@/pages/chat/ChatPage', () => ({
  ChatPage: ({ checkInId, settled }: any) => <div data-testid="the-conversation" data-check-in={checkInId}>{settled}</div>,
}))
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: me, isAuthenticated: true }) }))
vi.mock('@/api/grounds', () => ({
  groundsApi: { get: vi.fn(), getMySpecificity: vi.fn().mockResolvedValue(null), myTranscript: vi.fn().mockResolvedValue({ sessions: [] }), myNotes: vi.fn().mockResolvedValue([]), addMyNote: vi.fn(), checkInYourself: vi.fn() },
}))
vi.mock('@/api/reports', () => ({ reportsApi: { get: vi.fn().mockResolvedValue(null) } }))
vi.mock('@/api/participantRequests', () => ({ participantRequestsApi: { list: vi.fn().mockResolvedValue([]) } }))
vi.mock('@/api/documents', () => ({ documentsApi: { list: vi.fn() } }))
vi.mock('@/api/resolution', () => ({ resolutionApi: { get: vi.fn().mockResolvedValue(null), propose: vi.fn() } }))
vi.mock('@/api/conversation', () => ({ conversationApi: { remind: vi.fn() } }))
vi.mock('@/api/billing', () => ({ billingApi: { status: vi.fn().mockResolvedValue(null), getContributorCodeShareCard: vi.fn() } }))
const openSpy = vi.fn()
vi.mock('@/hooks/useOpenSession', () => ({
  useOpenSession: () => ({
    open: openSpy, opening: false, openFailed: false, openError: null, retryOpen: vi.fn(),
    paywall: { show: false, close: vi.fn(), freeExtensionAvailable: false, code: '', setCode: vi.fn(), codeMsg: null, setCodeMsg: vi.fn(), redeem: vi.fn(), claimFreeExtension: vi.fn(), createSubscription: vi.fn() },
  }),
}))

const tomorrowAt8 = () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(8, 0, 0, 0); return d.toISOString() }

/* Session 1 done by the lead and by Kwame; session 2 waits for tomorrow. The server's clock and count are served, as live. */
function sessionTwo(over: Record<string, any> = {}) {
  return {
    id: 'g1', label: 'Farmer Training', status: 'ACTIVE', scenario: 'SALES', timelineDays: 84, cadence: 'WEEKLY',
    daysLeft: 80, overdue: 0, initiatorId: 'u-lead', viewerRunsThisGround: true,
    report: { id: 'r1', releasedAt: null },
    sessionClock: { currentSession: 2, plannedSessions: 12, says: 'Check-in 2 of 12.', whileOpen: null },
    participants: [
      { id: 'p-lead', userId: 'u-lead', email: 'lead@x.test', partyType: 'INITIATOR', accepted: true, firstName: 'Akua' },
      { id: 'p-k', userId: 'u-k', email: 'k@x.test', partyType: 'PARTICIPANT', accepted: true, firstName: 'Kwame' },
    ],
    checkIns: [
      { id: 'c1', sessionNumber: 1, status: 'COMPLETED', participantId: 'p-lead', completedAt: '2027-02-08' },
      { id: 'k1', sessionNumber: 1, status: 'COMPLETED', participantId: 'p-k', completedAt: '2027-02-08' },
      { id: 'k2', sessionNumber: 2, status: 'NOT_STARTED', participantId: 'p-k', availableFrom: tomorrowAt8() },
    ],
    roundCompletions: [{ sessionNumber: 1 }],
    boardRenders: true,
    ...over,
  }
}

function renderAt(path: string, route: string, page: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <Routes><Route path={route} element={page} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const THE_PAGE_IN_BETWEEN = [
  /Session 2 of 12\.\s*Three|have checked in for session/, /See what each person said/, /Read how to run one/, /^Your turn\./,
  /It went back to session/, /report so far is ready to read/, /Check in yourself/, /Add context/, /Your check-ins/,
  /You check in when you choose/, /The report shows where you and the others agree/,
]

beforeEach(() => {
  vi.clearAllMocks()
  me = { id: 'u-lead', role: 'MEMBER', firstName: 'Akua', email: 'lead@x.test' }
})

describe('the lead’s Check-in tab', () => {
  it('draws her last conversation and the box that starts her next check-in, with none of the page in between', async () => {
    ;(groundsApi.get as any).mockResolvedValue(sessionTwo())
    const { container } = renderAt('/grounds/g1?tab=chat', '/grounds/:id', <GroundAdminPage />)
    expect((await screen.findByTestId('the-conversation')).getAttribute('data-check-in')).toBe('c1')
    expect(screen.getByRole('textbox', { name: 'Write anything you want me to remember' })).toBeTruthy()
    const text = container.textContent ?? ''
    for (const gone of THE_PAGE_IN_BETWEEN) expect(text).not.toMatch(gone)
    expect(openSpy).not.toHaveBeenCalled()
  })

  it('keeps every tab on screen around it', async () => {
    ;(groundsApi.get as any).mockResolvedValue(sessionTwo())
    renderAt('/grounds/g1?tab=chat', '/grounds/:id', <GroundAdminPage />)
    await screen.findByTestId('the-conversation')
    for (const name of ['Board', 'Check-in', 'My work', 'People and setup']) {
      expect(screen.getByRole('tab', { name })).toBeTruthy()
    }
    expect(screen.getByRole('tab', { name: 'Check-in', selected: true })).toBeTruthy()
  })

  it('draws the conversation the address names, not another', async () => {
    ;(groundsApi.get as any).mockResolvedValue(sessionTwo())
    renderAt('/grounds/g1?tab=chat&c=c1', '/grounds/:id', <GroundAdminPage />)
    expect((await screen.findByTestId('the-conversation')).getAttribute('data-check-in')).toBe('c1')
  })
})

describe('a team member’s Check-in tab', () => {
  beforeEach(() => { me = { id: 'u-k', role: 'MEMBER', firstName: 'Kwame', email: 'k@x.test' } })

  it('between check-ins, Kwame reads his last conversation, one quiet line about the next, and the box to add something', async () => {
    ;(groundsApi.get as any).mockResolvedValue(sessionTwo({ viewerRunsThisGround: false }))
    const { container } = renderAt('/grounds/g1/p?tab=chat', '/grounds/:id/p', <GroundParticipantPage />)
    expect((await screen.findByTestId('the-conversation')).getAttribute('data-check-in')).toBe('k1')
    expect(screen.getByText(/^Your next check-in opens tomorrow at 8/)).toBeTruthy()
    expect(screen.getByRole('textbox', { name: 'Write anything you want me to remember' })).toBeTruthy()
    const text = container.textContent ?? ''
    for (const gone of THE_PAGE_IN_BETWEEN) expect(text).not.toMatch(gone)
    expect(text).not.toContain('Your next check-in is open now')
  })

  it('with a check-in open now, the tab opens it for him there, never on another page', async () => {
    const rows = [
      { id: 'k1', sessionNumber: 1, status: 'COMPLETED', participantId: 'p-k', completedAt: '2027-02-08' },
      { id: 'k2', sessionNumber: 2, status: 'NOT_STARTED', participantId: 'p-k', availableFrom: new Date(Date.now() - 60_000).toISOString() },
    ]
    ;(groundsApi.get as any).mockResolvedValue(sessionTwo({
      viewerRunsThisGround: false,
      checkIns: rows,
      participants: [
        { id: 'p-lead', userId: 'u-lead', email: 'lead@x.test', partyType: 'INITIATOR', accepted: true, firstName: 'Akua' },
        { id: 'p-k', userId: 'u-k', email: 'k@x.test', partyType: 'PARTICIPANT', accepted: true, firstName: 'Kwame', checkIns: rows },
      ],
    }))
    renderAt('/grounds/g1/p?tab=chat', '/grounds/:id/p', <GroundParticipantPage />)
    await waitFor(() => expect(openSpy).toHaveBeenCalledWith(expect.objectContaining({ id: 'k2' }), expect.anything()))
    expect(screen.getByText('Getting your first question.')).toBeTruthy()
    /* Due, so it is the card alone (audit of the check-in pages, row 2): the way back to the board, and no crumb, schedule line or tab bar. */
    expect(screen.queryByRole('tab')).toBeNull()
    expect(screen.getByRole('link', { name: /Farmer Training/ }).getAttribute('href')).toBe('/grounds/g1/board')
  })
})
