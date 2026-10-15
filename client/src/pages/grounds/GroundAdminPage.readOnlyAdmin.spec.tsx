import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GroundAdminPage } from './GroundAdminPage'
import { groundsApi } from '@/api/grounds'
import { reportsApi } from '@/api/reports'
import { documentsApi } from '@/api/documents'

/**
 * REVIEW ROUND 3, ITEM 3: AN ADMIN WHO DOES NOT RUN THIS CHECK-IN, AND IS NOT A PARTY TO IT.
 *
 * The prototype's read-only view (docs/prototype/screens/A4-people-roles-and-access/
 * read-only-view.jpg/.txt) shows exactly three tabs - Board, Context, People and setup - and one
 * sentence: "You can read this check-in's board and reports. <lead> runs it." Not the lead's own
 * lines: not "2 of the 6 have not answered yet.", not the session-progress paragraph, not "How to
 * run one".
 *
 * An org admin viewing a ground they neither lead nor take part in used to get every tab (Check-in,
 * My work included) and every one of the lead's own status lines - the full running view, with only
 * the one added sentence to say she was not the lead. This pins the read-only view down to what the
 * prototype actually shows.
 */
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn() } }))
vi.mock('@/api/participantRequests', () => ({ participantRequestsApi: { list: vi.fn().mockResolvedValue([]) } }))
vi.mock('@/api/reports', () => ({ reportsApi: { get: vi.fn() } }))
vi.mock('@/api/documents', () => ({ documentsApi: { list: vi.fn() } }))
vi.mock('@/api/resolution', () => ({ resolutionApi: { get: vi.fn().mockResolvedValue(null), propose: vi.fn() } }))
vi.mock('@/stores/auth', () => ({
  useAuthStore: (sel: any) => sel({ user: { id: 'u-admin', role: 'ADMIN', email: 'admin@x.test' }, isAuthenticated: true }),
}))

function readOnlyGround(over: Record<string, any> = {}) {
  return {
    id: 'g1', label: 'Sales team, Q3', status: 'ACTIVE', scenario: 'SALES', timelineDays: 90, cadence: 'FORTNIGHTLY',
    daysLeft: 40, overdue: 2,
    /* The lead is somebody else; this viewer is neither the lead nor a party. */
    participants: [
      { id: 'p-lead', userId: 'u-lead', email: 'lead@x.test', partyType: 'INITIATOR', user: { firstName: 'Wairimu', lastName: 'Kamau' } },
      { id: 'p2', userId: 'u2', email: 'other@x.test', partyType: 'PARTICIPANT' },
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
      <MemoryRouter initialEntries={['/grounds/g1']}>
        <Routes><Route path="/grounds/:id" element={<GroundAdminPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('the read-only view, for an admin who neither runs nor takes part in this check-in', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(reportsApi.get as any).mockResolvedValue(null)
    ;(documentsApi.list as any).mockResolvedValue([])
    ;(groundsApi.get as any).mockResolvedValue(readOnlyGround())
  })

  it('shows exactly three tabs - Board, Context, People and setup', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByRole('tab', { name: 'People and setup' })).toBeTruthy())
    expect(screen.getByRole('tab', { name: 'Board' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Documents' })).toBeTruthy()
    expect(screen.queryByRole('tab', { name: 'Check-in' })).toBeNull()
    expect(screen.queryByRole('tab', { name: 'My work' })).toBeNull()
  })

  it('carries the prototype\'s one sentence, naming the lead', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText(/You can read this check-in.s board and reports\./)).toBeTruthy())
    expect(screen.getByText(/Wairimu Kamau runs it\./)).toBeTruthy()
  })

  it('does not carry the lead\'s own lines about running it', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByRole('tab', { name: 'Board' })).toBeTruthy())
    expect(screen.queryByText(/have not answered yet/)).toBeNull()
    expect(screen.queryByText(/How to run one/)).toBeNull()
  })

  it('never shows "I have read this - sign it off" - removed for everyone', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByRole('tab', { name: 'People and setup' })).toBeTruthy())
    expect(screen.queryByText(/sign it off/)).toBeNull()
    expect(screen.queryByText(/You have signed this off/)).toBeNull()
  })
})
