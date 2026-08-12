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
vi.mock('@/api/reports', () => ({ reportsApi: { get: vi.fn(), activationStatus: vi.fn() } }))
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
    ;(reportsApi.activationStatus as any).mockResolvedValue(null)
    ;(documentsApi.list as any).mockResolvedValue([])
  })

  it('shows each participant against their session-1 check-in', async () => {
    renderPage()
    await waitFor(() => expect(screen.getAllByText(/Jordan - Probation/i).length).toBeGreaterThan(0))
    // The card list is "Sessions" now: the conversation tab is the one called Check-in,
    // because that is the word the emails and buttons use. W13-8.
    fireEvent.click(screen.getByRole('button', { name: 'Sessions' }))
    await waitFor(() => {
      expect(screen.getByText('admin@example-test.invalid')).toBeTruthy()
      expect(screen.getByText('jordan@example-test.invalid')).toBeTruthy()
    })
    /**
     * Both rows are session 1, now distinguishable by participant.
     *
     * Counted with an EXACT match. A loose /Session 1/ also matches the header's
     * progress line ("Session 1 of 12"), which was added later - so the loose
     * version failed on a change that had nothing to do with these rows, and
     * would have gone on being wrong in either direction as the page grew.
     */
    expect(screen.getAllByText(/^Session 1$/i).length).toBe(2)
  })
})
