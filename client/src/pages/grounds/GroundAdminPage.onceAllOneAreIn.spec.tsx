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
/* My work is the B7 page for everybody (batch 1, group 10), drawn from the server's answer; "Who has answered" is under it. */
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

describe('B-056: the My work notice counts one person in words, not a bare digit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(reportsApi.get as any).mockResolvedValue(null)
    ;(documentsApi.list as any).mockResolvedValue([])
  })

  /*
   * CHANGED (page audit, 24 November 2026, row 8): the notice sat on the "Who has answered" roster, which folded into People and
   * setup's one list. It explained how the report forms rather than saying something about these people, so it went with the roster;
   * what B-056 protected, no bare digit standing in for a number, is still checked on the page "Who has answered" now opens.
   */
  it('"Who has answered" opens the one list of people, with no bare digit in a count', async () => {
    (groundsApi.get as any).mockResolvedValue({ ...BASE_GROUND })
    renderPage()
    await waitFor(() => expect(screen.getAllByText(/Get a project back on track/i).length).toBeGreaterThan(0))
    fireEvent.click(screen.getByRole('tab', { name: 'My work' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Who has answered' }))
    expect(await screen.findByRole('heading', { name: "Who's in it" })).toBeTruthy()
    expect(document.body.textContent).not.toMatch(/once all 1 are in|The picture builds as each person answers/)
  })
})
