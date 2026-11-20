import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GroundParticipantPage } from './GroundParticipantPage'
import { groundsApi } from '@/api/grounds'
import { reportsApi } from '@/api/reports'
import { apiClient } from '@/api/client'

/**
 * REVIEW ROUND 3, ITEM 1: AN IN_PROGRESS SESSION WAS TOLD "NO CHECK-IN OPEN RIGHT NOW".
 *
 * Aisha (ground 555ac67d) and Amani (ground 9028f0ad) both had a session the server had already
 * marked IN_PROGRESS - somebody had opened it, maybe answered a turn or two - with `availableFrom`
 * still the date it was CREATED on, which is before the session itself started and so is always in
 * the past by the time anyone opens it... except the review caught it with an `availableFrom` that
 * had not arrived yet either, which is the real shape a session gets when the check-in's cadence
 * places the next one a week out but the person is answering it early or the clock is odd. Either
 * way, an IN_PROGRESS session is open by definition; a date meant to gate a session that has not
 * started cannot also gate one that has.
 *
 * These shapes are the real ones from the review's own capture (aisha, checkIn c-open, IN_PROGRESS,
 * availableFrom several days in the future).
 */
vi.mock('@/stores/auth', () => ({
  useAuthStore: (sel: any) => sel({ user: { id: 'u-aisha', firstName: 'Aisha', lastName: 'Bello', email: 'aisha@x.test' } }),
}))
vi.mock('@/api/grounds', () => ({
  groundsApi: {
    get: vi.fn(),
    getMySpecificity: vi.fn(),
    myTranscript: vi.fn(),
    myNotes: vi.fn(),
  },
}))
vi.mock('@/api/reports', () => ({ reportsApi: { get: vi.fn() } }))
vi.mock('@/api/client', () => ({
  apiClient: { post: vi.fn() },
}))

const FUTURE = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()

function groundWithInProgressFutureAvailableFrom() {
  const checkIns = [{ id: 'c-open', participantId: 'p1', sessionNumber: 3, status: 'IN_PROGRESS', completedAt: null, availableFrom: FUTURE }]
  return {
    id: 'g1', label: 'Sales team, Q3', scenario: 'SALES', status: 'OPEN',
    timelineDays: 90, cadence: 'FORTNIGHTLY',
    /* `myOpenForAutoOpen` reads the participant's OWN nested `checkIns` (a second copy the real
       API also serves); `openCheckIn`/`dueNow` read the ground-level list. Both are set here, as
       the real payload has both, matching the review's own captured shape. */
    participants: [{ id: 'p1', userId: 'u-aisha', email: 'aisha@x.test', partyType: 'PARTICIPANT', roleAsDescribed: null, checkIns }],
    checkIns,
    signals: [],
  }
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds/g1/p']}>
        <Routes>
          <Route path="/grounds/:id/p" element={<GroundParticipantPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('an IN_PROGRESS session is open, whatever its availableFrom says', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(reportsApi.get as any).mockResolvedValue(null)
    ;(groundsApi.getMySpecificity as any).mockResolvedValue(null)
    ;(groundsApi.myTranscript as any).mockResolvedValue({ sessions: [] })
    ;(groundsApi.myNotes as any).mockResolvedValue([])
    ;(groundsApi.get as any).mockResolvedValue(groundWithInProgressFutureAvailableFrom())
    ;(apiClient.post as any).mockResolvedValue({ status: 200, data: {} })
  })

  it('does not tell the person there is no check-in open', async () => {
    renderPage()
    /* A check-in that is due is the card alone: the way back carries the name. */
    await waitFor(() => expect(screen.getByRole('link', { name: /Sales team, Q3/ })).toBeTruthy())
    expect(screen.queryByText(/No check-in open right now/i)).toBeNull()
    expect(screen.queryByText(/next session opens/i)).toBeNull()
  })

  it('the Check-in tab opens the session (the same call the header button makes)', async () => {
    renderPage()
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith('/check-ins/c-open/open', {}, expect.anything()))
  })

  it('the header offers "Start my check-in" on another tab, where it can be seen before it navigates', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/grounds/g1/p?tab=context']}>
          <Routes>
            <Route path="/grounds/:id/p" element={<GroundParticipantPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    await waitFor(() => expect(screen.getByRole('button', { name: 'Start my check-in' })).toBeTruthy())
    /* Not fired just by rendering another tab - only the Check-in tab or the button click does. */
    expect(apiClient.post).not.toHaveBeenCalled()
  })
})
