import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GroundParticipantPage } from './GroundParticipantPage'
import { groundsApi } from '@/api/grounds'
import { reportsApi } from '@/api/reports'
import { apiClient } from '@/api/client'

/**
 * B-226 (REVIEW 5): A FAILED "Start my check-in" OFF THE CHECK-IN TAB DID NOTHING VISIBLE.
 *
 * Walked live in the sweep bed as Dov and Amani: from Context and My work, this header button
 * called `openSession` directly, right where they stood. The 503 set the hook's own failure
 * state, but the only place that reads it - the Check-in tab's own failure note and "Try again" -
 * never rendered, because they were never on that tab. The press now goes to the Check-in tab
 * instead of opening directly when pressed from anywhere else, where the existing auto-open
 * effect makes the one attempt and its result shows in place.
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

function renderOn(path: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/grounds/:id/p" element={<GroundParticipantPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  ;(reportsApi.get as any).mockResolvedValue(null)
  ;(groundsApi.getMySpecificity as any).mockResolvedValue(null)
  ;(groundsApi.myTranscript as any).mockResolvedValue({ sessions: [] })
  ;(groundsApi.myNotes as any).mockResolvedValue([])
  ;(groundsApi.get as any).mockResolvedValue(groundWithAnOpenCheckIn())
  ;(apiClient.post as any).mockResolvedValue({ status: 503, data: { message: 'Could not start your check-in. Try again.' } })
})

describe('B-226: pressing "Start my check-in" off the Check-in tab', () => {
  it('from Context: goes to the Check-in tab and shows the failure note there, with only one open attempt', async () => {
    renderOn('/grounds/g1/p?tab=context')
    const btn = await screen.findByRole('button', { name: 'Start my check-in' })
    // Nothing has opened yet on this tab - pressing from here must not itself call the API.
    expect(apiClient.post).not.toHaveBeenCalled()
    fireEvent.click(btn)
    expect(await screen.findByRole('button', { name: 'Try again' })).toBeTruthy()
    expect(screen.getByText('Could not start your check-in. Try again.')).toBeTruthy()
    expect(apiClient.post).toHaveBeenCalledTimes(1)
  })

  it('from My work: goes to the Check-in tab and shows the failure note there, with only one open attempt', async () => {
    renderOn('/grounds/g1/p?tab=record')
    const btn = await screen.findByRole('button', { name: 'Start my check-in' })
    expect(apiClient.post).not.toHaveBeenCalled()
    fireEvent.click(btn)
    expect(await screen.findByRole('button', { name: 'Try again' })).toBeTruthy()
    expect(apiClient.post).toHaveBeenCalledTimes(1)
  })

  it('from the Check-in tab itself: pressing it again after a failure still only makes one more attempt, shown in place', async () => {
    renderOn('/grounds/g1/p')
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledTimes(1))
    const retry = await screen.findByRole('button', { name: 'Try again' })
    fireEvent.click(retry)
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledTimes(2))
    expect(await screen.findByRole('button', { name: 'Try again' })).toBeTruthy()
  })

  /**
   * B-226 (REVIEW 6): A SECOND PRESS, OFF THE TAB, AFTER A FAILURE, SENT NOTHING AT ALL.
   *
   * The fix above goes to the Check-in tab and lets its own auto-open effect make the attempt - but
   * that effect only ever tries once per check-in (`checkinTabOpenAttempted`), and a failure never
   * clears that guard. So going back to Context after the first failure and pressing "Start my
   * check-in" again just switched tabs a second time, with no request behind it: the reader landed
   * back on the same stale failure note, not a fresh attempt. An off-tab press after a failure is a
   * retry, and must call the retry itself before switching tabs.
   */
  it('from Context, after a failure: pressing it again sends one more request, not zero', async () => {
    renderOn('/grounds/g1/p?tab=context')
    const btn = await screen.findByRole('button', { name: 'Start my check-in' })
    fireEvent.click(btn)
    await screen.findByRole('button', { name: 'Try again' })
    expect(apiClient.post).toHaveBeenCalledTimes(1)

    // Back to the tab it started on, "References and resources" for everybody since Release 1B's switch went (it read
    // "Documents" when this mocked ground had no `contextEnabled`), the same way a real reader would: the tab bar's own
    // button, not a reload.
    fireEvent.click(screen.getByRole('tab', { name: 'References and resources' }))
    const btnAgain = await screen.findByRole('button', { name: 'Start my check-in' })
    fireEvent.click(btnAgain)

    await waitFor(() => expect(apiClient.post).toHaveBeenCalledTimes(2))
    expect(await screen.findByRole('button', { name: 'Try again' })).toBeTruthy()
  })
})

/*
 * B-231 (REVIEW 6): A LARGE EMPTY GAP ABOVE THE FAILURE NOTE AT 390. The failure note used to sit
 * in its own `<Page narrow>`, which always carries `.gwui-page-main`'s own padding (including its
 * large bottom padding, meant for a page that ends there) stacked on top of the header's own
 * `<Page>`, which already ends with that same bottom padding - roughly 150px of empty space above
 * a single word of the note. Fixed by giving the failure note a bare `.gwui-page-narrow` (the
 * centred column alone, none of `.gwui-page-main`'s padding) and by zeroing the header `<Page>`'s
 * own bottom padding at narrow widths, since it is never the last thing on this screen.
 */
describe('B-231: no second .gwui-page-main stacked above the failure note', () => {
  it('the failure note sits in a bare .gwui-page-narrow, not a second .gwui-page-main', async () => {
    renderOn('/grounds/g1/p')
    const note = await screen.findByText(/Could not start your check-in\. Try again\./)
    // Closest .gwui-page-main ancestor of the note, if any, must be the header's own - not a
    // second one wrapping the note itself.
    expect(note.closest('.gwui-page-main')).toBeNull()
    /* Changed in batch 2, group 5: the Check-in tab's own body is the conversation's frame now, the full width beside the
       sidebar (gwui-ci-tab-body), not the narrow column; the rule kept is the one above, no second page frame. */
    expect(note.closest('.gwui-ci-tab-body')).not.toBeNull()
  })
})
