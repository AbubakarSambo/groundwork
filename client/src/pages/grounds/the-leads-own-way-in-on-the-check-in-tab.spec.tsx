import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GroundAdminPage } from './GroundAdminPage'
import { groundsApi } from '@/api/grounds'
import { reportsApi } from '@/api/reports'

/**
 * DECISION 133 (change 6): THE LEAD'S CHECK-IN TAB OFFERS "CHECK IN YOURSELF" AND "ADD CONTEXT",
 * ANY TIME, INCLUDING FOR A LEAD WHO CHOSE "ONLY THE TEAM" BEFORE (managingOnly). Amani is the
 * signed-in reader. An admin who only reads it is not offered either.
 */
/* The conversation itself is ChatPage's own (pages/chat specs); here it is a stand-in that shows which one the tab draws and what
   the tab puts under it (batch 2, group 5). */
vi.mock('@/pages/chat/ChatPage', () => ({
  ChatPage: ({ checkInId, settled }: any) => <div data-testid="the-conversation" data-check-in={checkInId}>{settled}</div>,
}))
vi.mock('@/stores/ask', () => ({ useAskStore: (sel: any) => sel({ showForCheckInSetup: vi.fn(), showWith: vi.fn(), show: vi.fn() }) }))
vi.mock('@/stores/auth', () => ({
  useAuthStore: (sel: any) => sel({ user: { id: 'u-amani', firstName: 'Amani', lastName: 'Wekesa', email: 'amani@x.test' }, isAuthenticated: true }),
}))
vi.mock('@/api/grounds', () => ({
  groundsApi: { get: vi.fn(), getMySpecificity: vi.fn(), myTranscript: vi.fn(), myNotes: vi.fn(), checkInYourself: vi.fn() },
}))
vi.mock('@/api/reports', () => ({ reportsApi: { get: vi.fn() } }))
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


function ground(lead: Record<string, any>, over: Record<string, any> = {}) {
  return {
    id: 'g1', label: 'Sales team, Q3', scenario: 'GOAL_ALIGNMENT', status: 'ACTIVE', timelineDays: 90, cadence: 'WEEKLY', totalSessions: 6,
    participants: [
      { id: 'p-lead', email: 'x@x.test', partyType: 'INITIATOR', user: { firstName: 'Amani', lastName: 'Wekesa' }, ...lead },
      { id: 'p-brian', userId: 'u-brian', email: 'brian@x.test', partyType: 'PARTICIPANT', user: { firstName: 'Brian', lastName: 'Mwangi' } },
    ],
    checkIns: [{ id: 'c1', participantId: 'p-lead', sessionNumber: 1, status: 'COMPLETED', completedAt: '2026-09-01T10:00:00.000Z' }],
    signals: [], boardRenders: true,
    ...over,
  }
}

function renderTab(tab = 'chat') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/grounds/g1?tab=${tab}`]}>
        <Routes><Route path="/grounds/:id" element={<GroundAdminPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  ;(reportsApi.get as any).mockResolvedValue(null)
})

describe("the lead's own Check-in tab", () => {
  /* Changed in batch 2, group 5 (Hafsah, items 3b and 42): no page in between. Her last conversation is there, and the box under
     it is her way in: writing there starts her check-in. "Check in yourself" and "Add context" went with the page in between. */
  it('shows the lead her last conversation, with the box under it that starts her check-in', async () => {
    ;(groundsApi.get as any).mockResolvedValue(ground({ userId: 'u-amani' }, { initiatorId: 'u-amani' }))
    renderTab()
    expect((await screen.findByTestId('the-conversation')).getAttribute('data-check-in')).toBe('c1')
    expect(screen.getByRole('textbox', { name: 'Write anything you want me to remember' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Check in yourself' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Add context' })).toBeNull()
  })

  it('gives a lead who chose "only the team" the same way back in, with a line that is true now', async () => {
    ;(groundsApi.get as any).mockResolvedValue(ground({ userId: 'u-amani', managingOnly: true }, { initiatorId: 'u-amani' }))
    renderTab()
    expect(await screen.findByRole('textbox', { name: 'Write anything you want me to remember' })).toBeTruthy()
    expect(screen.queryByText('You check in when you choose. Use Check in yourself any time.')).toBeNull()
    expect(screen.queryByText(/You do not answer this check-in yourself/)).toBeNull()
  })

  it('never opens a session on its own once she has done her first check-in, on the Check-in tab or the board', async () => {
    for (const tab of ['chat', 'board']) {
      ;(groundsApi.get as any).mockResolvedValue(ground({ userId: 'u-amani' }, {
        initiatorId: 'u-amani',
        checkIns: [
          { id: 'c1', participantId: 'p-lead', sessionNumber: 1, status: 'COMPLETED', completedAt: '2026-09-01T10:00:00.000Z' },
          { id: 'c2', participantId: 'p-lead', sessionNumber: 2, status: 'NOT_STARTED', availableFrom: null },
        ],
      }))
      const { unmount } = renderTab(tab)
      if (tab === 'chat') expect(await screen.findByRole('textbox', { name: 'Write anything you want me to remember' })).toBeTruthy()
      else await screen.findAllByText(/Sales team, Q3/)
      expect(openSpy).not.toHaveBeenCalled()
      expect(screen.queryByText('Getting your first question.')).toBeNull()
      unmount()
    }
  })

  it('says the closing of her first check-in where she lands, and "in setup" opens People and setup', async () => {
    sessionStorage.setItem('gw-first-check-in-closing:g1', '1')
    ;(groundsApi.get as any).mockResolvedValue(ground({ userId: 'u-amani' }, { initiatorId: 'u-amani', cadence: 'WEEKLY', cadenceAnchorDay: 1 }))
    renderTab()
    const p = await screen.findByTestId('the-leads-first-closing')
    /* Changed 15 November 2026 (audit row 21): short, with "Change how often" as the link. */
    expect(p.textContent).toBe("That's your first one done. Your team will check in every Monday. Change how often")
    fireEvent.click(screen.getByRole('button', { name: 'Change how often' }))
    await waitFor(() => expect(screen.queryByTestId('the-leads-first-closing')).toBeNull())
    expect(screen.queryByRole('button', { name: 'Check in yourself' })).toBeNull()
    expect(screen.getByRole('tab', { name: 'People and setup', selected: true })).toBeTruthy()
  })

  it('offers neither to an admin who runs it for Rukia, the lead (only the lead checks in as the lead)', async () => {
    ;(groundsApi.get as any).mockResolvedValue(ground({ userId: 'u-rukia' }, { initiatorId: 'u-rukia', viewerIsInitiator: false, viewerRunsThisGround: true }))
    renderTab()
    await screen.findAllByText(/Sales team, Q3/)
    expect(screen.queryByRole('button', { name: 'Check in yourself' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Add context' })).toBeNull()
  })
})
