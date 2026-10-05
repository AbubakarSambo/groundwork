import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GroundAdminPage } from './GroundAdminPage'
import { groundsApi } from '@/api/grounds'
import { reportsApi } from '@/api/reports'
import { documentsApi } from '@/api/documents'

/**
 * WALKTHROUGH PASS 2, ITEM 1: THE PERSON WITH NO SEAT.
 *
 * The same person with no account yet used to read as "Zawadi U8" on the lead's own sessions
 * roster (this page's "Who has answered"), because `personLabel` guessed a name out of the address
 * the lead typed - a name nobody gave, and a different answer from "Somebody invited by email" on
 * People and setup and "A colleague" on the board for the same person. This roster now shows the
 * plain address instead (never a guess), and never offers "Copy invite link" or "Resend invite" to
 * somebody the engine says has no seat at all: their invitation has never gone out, so there is
 * nothing to send or resend.
 */

const GROUND = {
  id: 'g1', label: 'Sales team', scenario: 'NEW_PROJECT', moment: 'STARTING',
  status: 'OPEN', timelineDays: 90, cadence: 'MONTHLY', resolutionState: 'Keep going',
  brief: '', createdAt: new Date().toISOString(),
  participants: [
    { id: 'p1', email: 'admin@example-test.invalid', partyType: 'INITIATOR', userId: 'u-admin', accepted: true },
    /* No account, no real name, and no seat on the plan - the engine says so with `awaitingSeat`. */
    { id: 'p2', email: 'zawadi.u8@example-test.invalid', partyType: 'PARTICIPANT', userId: null, accepted: false, awaitingSeat: true },
  ],
  checkIns: [
    { id: 'c1', sessionNumber: 1, status: 'NOT_STARTED', participantId: 'p1', completedAt: null },
    { id: 'c2', sessionNumber: 1, status: 'NOT_STARTED', participantId: 'p2', completedAt: null },
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

async function openRoster() {
  renderPage()
  await waitFor(() => expect(screen.getAllByText(/Sales team/i).length).toBeGreaterThan(0))
  fireEvent.click(screen.getByRole('tab', { name: 'My work' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Who has answered' }))
}

describe('somebody with no seat, on the lead’s sessions roster', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(groundsApi.get as any).mockResolvedValue(GROUND)
    ;(reportsApi.get as any).mockResolvedValue(null)
    ;(documentsApi.list as any).mockResolvedValue([])
  })

  it('shows the plain address, never a name guessed out of it', async () => {
    await openRoster()
    await waitFor(() => expect(screen.getAllByText(/zawadi\.u8@example-test\.invalid/).length).toBeGreaterThan(0))
    expect(screen.queryByText(/Zawadi U8/)).toBeNull()
  })

  it('offers neither "Copy invite link" nor "Resend invite" - there is no invitation to send', async () => {
    await openRoster()
    await waitFor(() => expect(screen.getAllByText(/zawadi\.u8@example-test\.invalid/).length).toBeGreaterThan(0))
    expect(screen.queryByText('Copy invite link')).toBeNull()
    expect(screen.queryByText('Resend invite')).toBeNull()
    expect(screen.getByText('Your plan has no seat for them yet. An admin has to make room before their invitation goes out.')).toBeTruthy()
  })
})
