import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GroundAdminPage } from './GroundAdminPage'
import { groundsApi } from '@/api/grounds'
import { reportsApi } from '@/api/reports'
import { documentsApi } from '@/api/documents'

/**
 * U.9 REVIEW FIX 9: THE LEAD'S SESSIONS TAB SAYS WHAT IS TRUE ABOUT THE REPORT.
 *
 * "The picture builds as each person answers - you can read what it has so far. It is only
 * released to everybody once all 6 are in." is false the moment the report has already been
 * released while people are still pending - which can happen (an admin may release early). The
 * notice now reads `ground.report.releasedAt` and says which of the two is true, as a sentence,
 * with no dash joining two clauses.
 */

const BASE_GROUND = {
  id: 'g1', label: 'Sales team', scenario: 'NEW_PROJECT', moment: 'STARTING',
  status: 'OPEN', timelineDays: 90, cadence: 'MONTHLY', resolutionState: 'Keep going',
  brief: '', createdAt: new Date().toISOString(),
  participants: [
    { id: 'p1', email: 'admin@example-test.invalid', partyType: 'INITIATOR', userId: 'u-admin', accepted: true },
    { id: 'p2', email: 'amani.u8@example-test.invalid', nameGiven: 'Amani Wekesa', partyType: 'PARTICIPANT', userId: null, accepted: false },
  ],
  checkIns: [
    { id: 'c1', sessionNumber: 1, status: 'COMPLETED', participantId: 'p1', completedAt: new Date().toISOString() },
    { id: 'c2', sessionNumber: 1, status: 'NOT_STARTED', participantId: 'p2', completedAt: null },
  ],
}

/* My work is the B7 page for a lead too since Release 1B's switch went, drawn from GET /grounds/:id/my-work, with "Who has
   answered" under it; without the server's answer it says it could not be read, and the roster's way in is not drawn. */
vi.mock('@/api/grounds', async () => {
  const { SERVED_TO_THE_LEAD } = await import('./my-work-served.fixture')
  return { groundsApi: { get: vi.fn(), myWork: vi.fn().mockResolvedValue(SERVED_TO_THE_LEAD) } }
})
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

describe('the sessions tab notice says what is true about the report', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(reportsApi.get as any).mockResolvedValue(null)
    ;(documentsApi.list as any).mockResolvedValue([])
  })

  it('while nobody has released it, says the picture builds as people answer', async () => {
    (groundsApi.get as any).mockResolvedValue({ ...BASE_GROUND, report: null })
    renderPage()
    await waitFor(() => expect(screen.getAllByText(/Sales team/i).length).toBeGreaterThan(0))
    fireEvent.click(screen.getByRole('tab', { name: 'My work' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Who has answered' }))
    expect(await screen.findByText(/The picture builds as each person answers/)).toBeTruthy()
    expect(screen.getByText('Read it so far')).toBeTruthy()
    expect(document.body.textContent).not.toMatch(/answers - you/)
  })

  it('once it has already been shared early, says so, and does not still claim nobody has read it', async () => {
    (groundsApi.get as any).mockResolvedValue({ ...BASE_GROUND, report: { releasedAt: '2026-09-20T10:00:00.000Z' } })
    renderPage()
    await waitFor(() => expect(screen.getAllByText(/Sales team/i).length).toBeGreaterThan(0))
    fireEvent.click(screen.getByRole('tab', { name: 'My work' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Who has answered' }))
    expect(await screen.findByText('This report was already shared, on 20 Sept 2026, before everybody had checked in.')).toBeTruthy()
    expect(screen.getByText('Read it')).toBeTruthy()
    expect(document.body.textContent).not.toContain('The picture builds as each person answers')
  })
})
