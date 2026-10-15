import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GroundAdminPage } from './GroundAdminPage'
import { groundsApi } from '@/api/grounds'
import { reportsApi } from '@/api/reports'
import { documentsApi } from '@/api/documents'

/**
 * B-056: "ONCE ALL 1 ARE IN" IS NOT ENGLISH. The My work tab's notice read "The picture builds as
 * each person answers, and you can read what it has so far. It is only released to everybody once
 * all 1 are in." with one person on the check-in - a bare digit standing in for a number that was
 * never plural. With one person it now says it plainly: "once you have checked in" when the reader
 * is that one person, and with more than one, the count is said in words ("all two people are in"),
 * the way every other small number on this page already is.
 */
const PARTICIPANTS_SOLO = [
  { id: 'p1', email: 'tendai@kijani.test', partyType: 'INITIATOR', userId: 'u-lead', accepted: true },
]

const BASE_GROUND = {
  id: 'g1', label: 'Get a project back on track', scenario: 'NEW_PROJECT', moment: 'STARTING',
  status: 'OPEN', timelineDays: 90, cadence: 'MONTHLY', resolutionState: 'Keep going',
  brief: '', createdAt: new Date().toISOString(), initiatorId: 'u-lead',
  participants: PARTICIPANTS_SOLO,
  checkIns: [
    { id: 'c1', sessionNumber: 1, status: 'NOT_STARTED', participantId: 'p1', completedAt: null },
  ],
  report: null,
}

vi.mock('@/stores/auth', () => ({
  useAuthStore: (sel: any) => sel({ user: { id: 'u-lead', role: 'MEMBER', email: 'tendai@kijani.test' }, isAuthenticated: true }),
}))
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

describe('B-056: the My work notice counts one person in words, not a bare digit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(reportsApi.get as any).mockResolvedValue(null)
    ;(documentsApi.list as any).mockResolvedValue([])
  })

  it('tells the reader, who is the one person on the check-in, to check in herself', async () => {
    (groundsApi.get as any).mockResolvedValue({ ...BASE_GROUND })
    renderPage()
    await waitFor(() => expect(screen.getAllByText(/Get a project back on track/i).length).toBeGreaterThan(0))
    fireEvent.click(screen.getByRole('tab', { name: 'My work' }))
    expect(await screen.findByText(/once you have checked in/)).toBeTruthy()
    expect(screen.queryByText(/once all 1 are in/)).toBeNull()
  })

  it('says "they are in" when the reader is not the one person on the check-in', async () => {
    (groundsApi.get as any).mockResolvedValue({
      ...BASE_GROUND,
      participants: [{ id: 'p1', email: 'amani@kijani.test', partyType: 'INITIATOR', userId: 'u-amani', accepted: true }],
    })
    renderPage()
    await waitFor(() => expect(screen.getAllByText(/Get a project back on track/i).length).toBeGreaterThan(0))
    fireEvent.click(screen.getByRole('tab', { name: 'My work' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Who has answered' }))
    expect(await screen.findByText(/once they are in/)).toBeTruthy()
  })
})
