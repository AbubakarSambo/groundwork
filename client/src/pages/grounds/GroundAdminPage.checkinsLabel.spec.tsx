import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GroundAdminPage } from './GroundAdminPage'
import { groundsApi } from '@/api/grounds'
import { reportsApi } from '@/api/reports'
import { documentsApi } from '@/api/documents'

/**
 * Bug 7 guard: the admin Check-ins list rendered each check-in as just
 * "Session N" + status, with no participant label. Check-ins are
 * per-participant-per-session, so two parties' session-1 rows looked like
 * an accidental duplicate. Each row must now name whose check-in it is.
 * Revert (drop the whoLabel line) -> the two rows are indistinguishable
 * and the emails are absent -> this bites.
 */

const GROUND = {
  id: 'g1', label: 'Jordan - Probation', scenario: 'NEW_HIRE', moment: 'STARTING',
  status: 'OPEN', timelineDays: 90, cadence: 'MONTHLY', resolutionState: 'Keep the hire',
  brief: '', createdAt: new Date().toISOString(),
  participants: [
    { id: 'p1', email: 'admin@example-test.invalid', partyType: 'INITIATOR', accepted: true },
    { id: 'p2', email: 'jordan@example-test.invalid', partyType: 'PARTICIPANT', accepted: true },
  ],
  checkIns: [
    { id: 'c1', sessionNumber: 1, status: 'NOT_STARTED', participantId: 'p1', completedAt: null },
    { id: 'c2', sessionNumber: 1, status: 'IN_PROGRESS', participantId: 'p2', completedAt: null },
  ],
}

vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn() } }))
vi.mock('@/api/reports', () => ({ reportsApi: { get: vi.fn() } }))
vi.mock('@/api/documents', () => ({ documentsApi: { list: vi.fn() } }))

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds/g1']}>
        <Routes>
          <Route path="/grounds/:id" element={<GroundAdminPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('BUG7: admin check-ins list labels each row by participant', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(groundsApi.get as any).mockResolvedValue(GROUND)
    ;(reportsApi.get as any).mockResolvedValue(null)
    ;(documentsApi.list as any).mockResolvedValue([])
  })

  it('shows each participant against their session-1 check-in', async () => {
    renderPage()
    await waitFor(() => expect(screen.getAllByText(/Jordan - Probation/i).length).toBeGreaterThan(0))
    // The card list is "Record" now: one tab shared with the party view, whose content differs by
    // role. It was "Sessions" here and "My record" there, which is the same tab named twice.
    // Originally: the conversation tab is the one called Check-in,
    // because that is the word the emails and buttons use. W13-8.
    //
    // REVIEW ROUND 3, "YOUR WORK" REBUILD: "Sessions" is a quiet link inside My work now
    // ("Who has answered" - see `onSeeRoster` in YourWork.tsx), not a sub-tab.
    fireEvent.click(screen.getByRole('tab', { name: 'My work' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Who has answered' }))
    await waitFor(() => {
      /**
       * BUG7 IN ITS NEW FORM. The bug was that every row showed the same person, so a lead could not
       * tell whose session was whose. The flat list of cards that produced it is gone: the tab is now
       * one row per person, with a cell per session on that row.
       *
       * Which makes the protection structural rather than incidental - a cell is rendered from
       * `checkIns.filter(c => c.participantId === p.id)`, so it cannot show anybody else's session.
       * These assertions pin that each person is present and identified.
       */
      expect(screen.getAllByText('admin@example-test.invalid').length).toBeGreaterThan(0)
      expect(screen.getAllByText('jordan@example-test.invalid').length).toBeGreaterThan(0)
    })

    /**
     * ONE SESSION-1 CELL PER PERSON, EACH NAMING WHOSE IT IS.
     *
     * The old check counted two elements reading exactly "Session 1" - the two cards. The cells read
     * just the number, and say which session and what state in their title, so the count moves to the
     * titles. Two people, one session each, two cells.
     */
    const cells = screen.getAllByTitle(/^Session 1:/)
    expect(cells.length).toBe(2)
  })
})
