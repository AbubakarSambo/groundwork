import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GroundAdminPage } from './GroundAdminPage'
import { groundsApi } from '@/api/grounds'
import { reportsApi } from '@/api/reports'
import { documentsApi } from '@/api/documents'

/**
 * THE BOARD HAS TO BE SOMEWHERE A PERSON WOULD LOOK.
 *
 * It existed, it worked, and it was reachable from exactly one place: a small
 * dark pill sitting up beside the ground's status line, on one row, with no
 * mention anywhere else in the product. Someone who did not happen to notice it
 * there had no way of knowing there was a board at all - which is what happened
 * on a real read-through of a finished ground.
 *
 * The board is per-ground, so a global navigation entry would have to guess
 * which ground was meant. The tab row is where somebody already looks for the
 * parts of a ground: Overview, Check-ins, Documents, Report, Settings. Team
 * board belongs in that list.
 *
 * The server still decides whether a ground has one. This only changes where the
 * way in lives.
 */

vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn() } }))
vi.mock('@/api/participantRequests', () => ({ participantRequestsApi: { list: vi.fn().mockResolvedValue([]) } }))
vi.mock('@/api/reports', () => ({ reportsApi: { get: vi.fn(), activationStatus: vi.fn() } }))
vi.mock('@/api/documents', () => ({ documentsApi: { list: vi.fn() } }))
vi.mock('@/api/resolution', () => ({ resolutionApi: { get: vi.fn().mockResolvedValue(null), propose: vi.fn() } }))
vi.mock('@/stores/auth', () => ({
  useAuthStore: (sel: any) => sel({ user: { id: 'u1', role: 'ADMIN', email: 'lead@x.test' }, isAuthenticated: true }),
}))

const navigated: string[] = []
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom')
  return { ...actual, useNavigate: () => (to: string) => { navigated.push(to) } }
})

function ground(over: Record<string, any> = {}) {
  return {
    id: 'g1',
    label: 'New hire',
    status: 'ACTIVE',
    scenario: 'NEW_HIRE',
    moment: 'STARTING',
    timelineDays: 90,
    cadence: 'WEEKLY',
    daysLeft: 40,
    participants: [{ id: 'p1', userId: 'u1', email: 'lead@x.test', partyType: 'INITIATOR' }],
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

describe('finding the team board', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    navigated.length = 0
    ;(reportsApi.get as any).mockResolvedValue(null)
    ;(reportsApi.activationStatus as any).mockResolvedValue(null)
    ;(documentsApi.list as any).mockResolvedValue([])
  })

  it('sits in the tab row with the other parts of a ground', async () => {
    ;(groundsApi.get as any).mockResolvedValue(ground())
    renderPage()

    await waitFor(() => expect(screen.getByRole('button', { name: 'Overview' })).toBeTruthy())
    // THE REGRESSION: this only ever existed as a floating pill elsewhere.
    expect(screen.getByRole('button', { name: 'Team board' })).toBeTruthy()
  })

  it('is not offered on a ground the server says has no board', async () => {
    // The server decides. This did not change; only the location did.
    ;(groundsApi.get as any).mockResolvedValue(ground({ boardRenders: false }))
    renderPage()

    await waitFor(() => expect(screen.getByRole('button', { name: 'Overview' })).toBeTruthy())
    expect(screen.queryByRole('button', { name: 'Team board' })).toBeNull()
  })

  it('leaves the other tabs alone', async () => {
    ;(groundsApi.get as any).mockResolvedValue(ground())
    renderPage()

    await waitFor(() => expect(screen.getByRole('button', { name: 'Overview' })).toBeTruthy())
    // "Check-ins" became "Sessions" when the conversation tab took the product's own word.
    // W13-8.
    // "Settings" is "Ground settings" since W13-9: /settings is the account, and one word for
    // both sent people to the wrong page in both directions.
    for (const label of ['Overview', 'Sessions', 'Documents', 'Report', 'Ground settings']) {
      expect(screen.getByRole('button', { name: label })).toBeTruthy()
    }
  })
})
