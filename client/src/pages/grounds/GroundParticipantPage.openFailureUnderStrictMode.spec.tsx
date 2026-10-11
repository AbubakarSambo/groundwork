import { describe, it, expect, vi, beforeEach } from 'vitest'
import { StrictMode } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GroundParticipantPage } from './GroundParticipantPage'
import { groundsApi } from '@/api/grounds'
import { reportsApi } from '@/api/reports'
import { apiClient } from '@/api/client'

/**
 * B-211 (REVIEW 4): A FAILED OPEN MUST SAY SO EVEN UNDER REACT'S DOUBLE EFFECT RUN.
 *
 * Walked live in the sweep bed, 11 October, as Dov and Amani, in the real dev server (never in a
 * production build): the Check-in tab's silent auto-open sent one real `POST
 * /check-ins/:id/open`, the server answered 503, and the page still read "Opening your check-in…"
 * forty seconds later with no note and no "Try again". Read from the query client's own mutation
 * cache in the browser, the request HAD settled to an error - but `useOpenSession` carried the
 * probe through `useMutation`, whose subscription to that result is rebuilt by React's
 * development-mode mount/clean-up/mount cycle, and the page's copy of the hook was left
 * unsubscribed from the mutation that was still answering it. `useOpenSession` now keeps the
 * probe's status in plain `useState`, which has no subscription to lose.
 *
 * The exact subscribe/unsubscribe race only showed up against a real network round trip in a real
 * browser; it does not reproduce under `@testing-library/react`'s synchronous, act-wrapped
 * rendering, with or without the fix, even with a delayed mock response (tried here and
 * confirmed against the pre-fix code). This test instead guards the behaviour the fix is for -
 * rendered in `StrictMode` so it also exercises the double effect run - and should be read
 * alongside the real-browser check in the round 6 screenshots, not instead of it.
 */
vi.mock('@/stores/auth', () => ({
  useAuthStore: (sel: any) => sel({ user: { id: 'u-dov', firstName: 'Dov', lastName: 'Ellison', email: 'dov@x.test' } }),
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

function groundWithAnOpenCheckIn() {
  const checkIns = [{ id: 'c-open', participantId: 'p1', sessionNumber: 3, status: 'NOT_STARTED', completedAt: null, availableFrom: new Date(Date.now() - 60_000).toISOString() }]
  return {
    id: 'g1', label: 'Night rota', scenario: 'SALES', status: 'OPEN',
    timelineDays: 90, cadence: 'WEEKLY',
    participants: [{ id: 'p1', userId: 'u-dov', email: 'dov@x.test', partyType: 'PARTICIPANT', roleAsDescribed: null, checkIns }],
    checkIns,
    signals: [],
  }
}

describe('a failed open under StrictMode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(reportsApi.get as any).mockResolvedValue(null)
    ;(groundsApi.getMySpecificity as any).mockResolvedValue(null)
    ;(groundsApi.myTranscript as any).mockResolvedValue({ sessions: [] })
    ;(groundsApi.myNotes as any).mockResolvedValue([])
    ;(groundsApi.get as any).mockResolvedValue(groundWithAnOpenCheckIn())
    /* A real network round trip takes real time - long enough for React's development-mode
       mount/clean-up/mount cycle to finish first, which is exactly the ordering that exposed
       B-211 live (the request was still in flight when the clean-up ran). A promise that
       resolves on the next microtask, as `mockResolvedValue` does, settles before that cycle
       has even started and never exercises the race; a short real delay does. */
    ;(apiClient.post as any).mockImplementation(() => new Promise(resolve => {
      setTimeout(() => resolve({ status: 503, data: { message: 'Could not start your check-in. Try again.' } }), 20)
    }))
  })

  it('shows the failure note and a working Try again, not a permanent Opening…', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <StrictMode>
        <QueryClientProvider client={qc}>
          <MemoryRouter initialEntries={['/grounds/g1/p']}>
            <Routes>
              <Route path="/grounds/:id/p" element={<GroundParticipantPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      </StrictMode>,
    )
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith('/check-ins/c-open/open', {}, expect.anything()))
    expect(await screen.findByRole('button', { name: 'Try again' }, { timeout: 6000 })).toBeTruthy()
    expect(screen.queryByText('Opening your check-in…')).toBeNull()
    // Only the one attempt - the hook's own guard is unchanged.
    expect(apiClient.post).toHaveBeenCalledTimes(1)
  }, 20000)
})
