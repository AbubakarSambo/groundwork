import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GroundAdminPage } from './GroundAdminPage'
import { groundsApi } from '@/api/grounds'
import { reportsApi } from '@/api/reports'
import { documentsApi } from '@/api/documents'

/**
 * A BARE NAME ON THE PARTICIPANTS ROSTER SAYS NOTHING ABOUT WHERE THEY ARE (U.8 re-review).
 *
 * WhoIsStillOut, on the lead's Done page, already says this as a full sentence: "Amani has not
 * joined yet." This roster - the check-in's own list of who is on it - printed only the name, with
 * no sentence after it, so somebody who has never opened the invite looked identical to somebody
 * mid-session. Same fact, same words, added here too.
 */

const GROUND = {
  id: 'g1', label: 'Sales team', scenario: 'NEW_PROJECT', moment: 'STARTING',
  status: 'OPEN', timelineDays: 90, cadence: 'MONTHLY', resolutionState: 'Keep going',
  brief: '', createdAt: new Date().toISOString(),
  participants: [
    { id: 'p1', email: 'admin@example-test.invalid', partyType: 'INITIATOR', userId: 'u-admin', accepted: true },
    /* Picked from the colleague list, real account, has not opened the invite yet. */
    { id: 'p2', email: 'amani.u8@example-test.invalid', nameGiven: 'Amani Wekesa', partyType: 'PARTICIPANT', userId: null, accepted: false },
    /* Already joined: no follow-up sentence belongs on her row. */
    { id: 'p3', email: 'zawadi@example-test.invalid', partyType: 'PARTICIPANT', userId: 'u-zawadi', user: { firstName: 'Zawadi', lastName: 'Njoroge' }, accepted: true },
  ],
  checkIns: [
    { id: 'c1', sessionNumber: 1, status: 'NOT_STARTED', participantId: 'p1', completedAt: null },
    { id: 'c2', sessionNumber: 1, status: 'NOT_STARTED', participantId: 'p2', completedAt: null },
    { id: 'c3', sessionNumber: 1, status: 'IN_PROGRESS', participantId: 'p3', completedAt: null },
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

describe('the participants roster says who has not joined yet', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(groundsApi.get as any).mockResolvedValue(GROUND)
    ;(reportsApi.get as any).mockResolvedValue(null)
    ;(documentsApi.list as any).mockResolvedValue([])
  })

  it('names her with her real account name, and says she has not joined yet', async () => {
    renderPage()
    await waitFor(() => expect(screen.getAllByText(/Sales team/i).length).toBeGreaterThan(0))
    fireEvent.click(screen.getByRole('tab', { name: 'My work' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Who has answered' }))
    await waitFor(() => expect(screen.getAllByText(/Amani Wekesa/i).length).toBeGreaterThan(0))
    expect(screen.getByText('Amani Wekesa has not joined yet.')).toBeTruthy()
  })

  it('says nothing extra for somebody who has already joined', async () => {
    renderPage()
    await waitFor(() => expect(screen.getAllByText(/Sales team/i).length).toBeGreaterThan(0))
    fireEvent.click(screen.getByRole('tab', { name: 'My work' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Who has answered' }))
    await waitFor(() => expect(screen.getAllByText(/Zawadi Njoroge/i).length).toBeGreaterThan(0))
    expect(screen.queryByText(/Zawadi Njoroge has not joined yet\./)).toBeNull()
  })
})
