import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
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
 * dark pill sitting up beside the check-in's status line, on one row, with no
 * mention anywhere else in the product. Someone who did not happen to notice it
 * there had no way of knowing there was a board at all - which is what happened
 * on a real read-through of a finished ground.
 *
 * The board is per-ground, so a global navigation entry would have to guess
 * which ground was meant. It went in the tab row first - and that was wrong for a
 * reason the pill had hidden: every other tab changes what is below the row, and
 * this one navigated away, so you left the check-in to look at part of the
 * check-in and landed on a page with its own back-link.
 *
 * It now opens from the foot of Report, which is where somebody is when they want
 * it: the board is the shared picture you talk over once you have read what the
 * accounts said. One way in, and it is where it is used.
 *
 * The server still decides whether a check-in has one. This only changes where the
 * way in lives.
 */

vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn() } }))
vi.mock('@/api/participantRequests', () => ({ participantRequestsApi: { list: vi.fn().mockResolvedValue([]) } }))
vi.mock('@/api/reports', () => ({ reportsApi: { get: vi.fn() } }))
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
    ;(documentsApi.list as any).mockResolvedValue([])
  })

  /**
   * REVIEW ROUND 3, "YOUR WORK" REBUILD: "Report" and "Sessions" ARE NOT SUB-TABS ANY MORE.
   *
   * The prototype's my-record.txt has no sub-tabs at all - "My work" is one flat page
   * (`YourWork`) now, and what used to be the "Report" sub-tab is a quiet link inside it,
   * "Every session" (see `onSeeEverySession` in YourWork.tsx). Clicking it still lands on the
   * same underlying `report` tab content, unchanged - only the way there changed.
   */
  it('is offered from "Every session", not from the tab row', async () => {
    ;(groundsApi.get as any).mockResolvedValue(ground())
    renderPage()

    /** Waits on a tab that is always present. "Overview" was used here and no longer exists. */
    await waitFor(() => expect(screen.getByRole('tab', { name: 'My work' })).toBeTruthy())
    // THE REGRESSION THIS STILL GUARDS: the board once had no way in but a floating pill.
    expect(screen.queryByRole('button', { name: 'Team board' })).toBeNull()
    fireEvent.click(screen.getByRole('tab', { name: 'My work' }))
    /** It is behind "Every session", because that is where somebody is when they want it. */
    await waitFor(() => expect(screen.getByRole('button', { name: 'Every session' })).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Every session' }))
    await waitFor(() => expect(document.body.textContent).toContain('Everything so far'))
  })

  it('is not offered on a check-in the server says has no board', async () => {
    // The server decides. This did not change; only the location did.
    ;(groundsApi.get as any).mockResolvedValue(ground({ boardRenders: false }))
    renderPage()

    await waitFor(() => expect(screen.getByRole('tab', { name: 'My work' })).toBeTruthy())
    fireEvent.click(screen.getByRole('tab', { name: 'My work' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Every session' })).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Every session' }))
    await waitFor(() => expect(document.body.textContent).not.toContain('Everything so far'))
  })

  it('leaves the other tabs alone, and offers both quiet links inside My work', async () => {
    ;(groundsApi.get as any).mockResolvedValue(ground())
    renderPage()

    /** Waits on a tab that is always present. "Overview" was used here and no longer exists. */
    await waitFor(() => expect(screen.getByRole('tab', { name: 'My work' })).toBeTruthy())
    // The outer row: the prototype's five, "Setup" relabelled "People and setup".
    for (const label of ['Check-in', 'Documents', 'My work', 'People and setup']) {
      expect(screen.getByRole('tab', { name: label })).toBeTruthy()
    }
    // "Report" and "Sessions" are quiet links inside My work now, not sub-tabs - see the note above.
    fireEvent.click(screen.getByRole('tab', { name: 'My work' }))
    for (const label of ['Every session', 'Who has answered']) {
      expect(await screen.findByRole('button', { name: label })).toBeTruthy()
    }
  })
})
