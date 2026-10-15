import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GroundAdminPage } from './GroundAdminPage'
import { GroundParticipantPage } from './GroundParticipantPage'
import { groundsApi } from '@/api/grounds'

/**
 * B-223: ARRIVING ON MY WORK OR PEOPLE AND SETUP MUST NEVER OPEN A SESSION.
 *
 * Walked live as Mira (lead) on `?tab=mywork` and `?tab=people`: both sent `POST
 * /check-ins/:id/open`. `?tab=mywork` and `?tab=people` are the outer tab row's own keys
 * (`outerTabOf`, and the row's own `{ key: 'mywork', ... }` / `{ key: 'people', ... }` entries on
 * both pages) - neither page's URL-to-tab map (`FROM_TAB_KEY`) recognised them, so both fell
 * through to the default tab, which is the Check-in tab, which auto-opens a session on mount. A
 * session must open only from the Check-in tab itself, or a press to start.
 */
const openMySession = vi.fn()
vi.mock('@/hooks/useOpenSession', () => ({
  useOpenSession: () => ({
    open: openMySession,
    opening: false,
    openFailed: false,
    openError: null,
    retryOpen: vi.fn(),
    paywall: { show: false, close: vi.fn(), freeExtensionAvailable: false, code: '', setCode: vi.fn(), codeMsg: null, setCodeMsg: vi.fn(), redeem: vi.fn(), claimFreeExtension: vi.fn(), createSubscription: vi.fn() },
  }),
}))
let currentUser: { id: string; role: string; email: string }
vi.mock('@/stores/auth', () => ({
  useAuthStore: (sel: any) => sel({ user: currentUser, isAuthenticated: true }),
}))
vi.mock('@/api/grounds', () => ({
  groundsApi: { get: vi.fn(), getMySpecificity: vi.fn(), myTranscript: vi.fn(), myNotes: vi.fn() },
}))
vi.mock('@/api/participantRequests', () => ({ participantRequestsApi: { list: vi.fn().mockResolvedValue([]) } }))
vi.mock('@/api/reports', () => ({ reportsApi: { get: vi.fn().mockResolvedValue(null) } }))
vi.mock('@/api/documents', () => ({ documentsApi: { list: vi.fn() } }))
vi.mock('@/api/resolution', () => ({ resolutionApi: { get: vi.fn().mockResolvedValue(null), propose: vi.fn() } }))
vi.mock('@/api/conversation', () => ({ conversationApi: { remind: vi.fn() } }))
vi.mock('@/api/billing', () => ({ billingApi: { status: vi.fn().mockResolvedValue(null), getContributorCodeShareCard: vi.fn() } }))

function aGroundWhereTheViewerChecksIn() {
  return {
    id: 'g1', label: 'Sales organisation', status: 'OPEN', scenario: 'SALES',
    timelineDays: 90, cadence: 'WEEKLY', totalSessions: 12, initiatorId: 'u-mira',
    participants: [
      { id: 'p-lead', userId: 'u-mira', email: 'mira@x.test', partyType: 'INITIATOR', user: { firstName: 'Mira' }, checkIns: [
        { id: 'c1', participantId: 'p-lead', sessionNumber: 2, status: 'NOT_STARTED', completedAt: null, availableFrom: new Date(Date.now() - 60_000).toISOString() },
      ] },
    ],
    checkIns: [
      { id: 'c1', participantId: 'p-lead', sessionNumber: 2, status: 'NOT_STARTED', availableFrom: new Date(Date.now() - 60_000).toISOString() },
    ],
    signals: [],
    boardRenders: true,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  currentUser = { id: 'u-mira', role: 'ADMIN', email: 'mira@x.test' }
  ;(groundsApi.get as any).mockResolvedValue(aGroundWhereTheViewerChecksIn())
  ;(groundsApi.getMySpecificity as any).mockResolvedValue(null)
  ;(groundsApi.myTranscript as any).mockResolvedValue({ sessions: [] })
  ;(groundsApi.myNotes as any).mockResolvedValue([])
})

describe('the lead\'s page (GroundAdminPage)', () => {
  it('does not open a session on ?tab=mywork', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/grounds/g1?tab=mywork']}>
          <Routes><Route path="/grounds/:id" element={<GroundAdminPage />} /></Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    await screen.findByRole('heading', { name: 'Sales organisation' })
    expect(openMySession).not.toHaveBeenCalled()
  })

  it('does not open a session on ?tab=people', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/grounds/g1?tab=people']}>
          <Routes><Route path="/grounds/:id" element={<GroundAdminPage />} /></Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    await screen.findByRole('heading', { name: 'Sales organisation' })
    expect(openMySession).not.toHaveBeenCalled()
  })
})

describe('a participant\'s page (GroundParticipantPage)', () => {
  it('does not open a session on ?tab=mywork', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/grounds/g1/p?tab=mywork']}>
          <Routes><Route path="/grounds/:id/p" element={<GroundParticipantPage />} /></Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    await screen.findByRole('heading', { name: 'Sales organisation' })
    expect(openMySession).not.toHaveBeenCalled()
  })

  it('does not open a session on ?tab=people', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/grounds/g1/p?tab=people']}>
          <Routes><Route path="/grounds/:id/p" element={<GroundParticipantPage />} /></Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    await screen.findByRole('heading', { name: 'Sales organisation' })
    expect(openMySession).not.toHaveBeenCalled()
  })
})
