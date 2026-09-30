import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GroundParticipantPage } from './GroundParticipantPage'
import { groundsApi } from '@/api/grounds'
import { reportsApi } from '@/api/reports'
import { apiClient } from '@/api/client'

/**
 * NOTHING ABOUT "NEXT" WHILE THE CURRENT ONE IS STILL OPENING (U.8 third review).
 *
 * The ground page's own "Check in" button hands off to this page with `?open=1`, which fires
 * `probeSession` (POST /check-ins/:id/open) the moment the page mounts - and that request can
 * take up to a minute (ConversationService.open). Read live: a lead landed here mid-open and the
 * header said "The next session opens on 12 October" while her FIRST session had not even
 * finished opening - a promise about the session after this one, before this one exists.
 */

vi.mock('@/stores/auth', () => ({
  useAuthStore: (sel: any) => sel({ user: { id: 'u1', firstName: 'Jordan', lastName: 'Reyes', email: 'jordan@x.test' } }),
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

const GROUND = {
  id: 'g1', label: 'Jordan - Probation', scenario: 'NEW_HIRE', status: 'OPEN',
  timelineDays: 90, cadence: 'MONTHLY',
  participants: [{ id: 'p1', userId: 'u1', email: 'jordan@x.test', partyType: 'PARTICIPANT', roleAsDescribed: null, checkIns: [{ id: 'c1', sessionNumber: 1, status: 'NOT_STARTED', availableFrom: null }] }],
  /*
   * THE DISCREPANCY THAT MAKES THIS POSSIBLE: the top-level `checkIns` (what the header reads for
   * "opens on") still carries a future `availableFrom` for session 1, while the auto-open path
   * reads the PARTICIPANT'S OWN nested `checkIns` above, which has none - so the probe fires from
   * one read of the data while the header would otherwise still be reading the other.
   */
  checkIns: [{ id: 'c1', participantId: 'p1', sessionNumber: 1, status: 'NOT_STARTED', completedAt: null, availableFrom: new Date(Date.now() + 7 * 86_400_000).toISOString() }],
  signals: [],
}

function renderPage(query = '') {
  // The auto-open effect reads `window.location.search` directly (not the router's own location),
  // so jsdom's real URL has to carry the query string too, not only MemoryRouter's initialEntries.
  window.history.pushState({}, '', `/grounds/g1/p${query}`)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/grounds/g1/p${query}`]}>
        <Routes>
          <Route path="/grounds/:id/p" element={<GroundParticipantPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('the header says nothing about the next session while this one is opening', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(reportsApi.get as any).mockResolvedValue(null)
    ;(groundsApi.getMySpecificity as any).mockResolvedValue(null)
    ;(groundsApi.myTranscript as any).mockResolvedValue({ sessions: [] })
    ;(groundsApi.myNotes as any).mockResolvedValue([])
    ;(groundsApi.get as any).mockResolvedValue(GROUND)
  })

  it('while the auto-open handoff is pending, says nothing about a later session', async () => {
    // Never resolves within this test - the point is to observe the mid-open state.
    vi.spyOn(apiClient, 'post').mockImplementation(() => new Promise(() => {}))
    renderPage('?open=1')

    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith('/check-ins/c1/open', {}, expect.anything()))
    /*
     * U.10 PICTURE-CHECK ROUND 6, ITEM I: THE TITLE NOW APPEARS TWICE, ON PURPOSE.
     * The shared check-in header (TheCheckInHeader.tsx) draws the ground's name both in its
     * breadcrumb ("Check-ins / Jordan - Probation") and as the page's own <h1> - a real UI change
     * (item I), not a regression this test happens to have caught. findByText (singular) fails the
     * moment there is more than one match, so this now waits for at least one.
     */
    await screen.findAllByText(/Jordan - Probation/i)
    expect(screen.queryByText(/Your next session opens on/i)).toBeNull()
  })

  it('once nothing is opening, the same data reads the next session\'s date honestly', async () => {
    /**
     * ROUND 4, ITEM A STEP 3: THE CHECK-IN TAB ITSELF NOW AUTO-OPENS TOO.
     *
     * `tab === 'checkin'` is this page's own default, and opening that tab now fires the same
     * paywall-aware probe `?open=1` always did (see GroundParticipantPage.tsx's own effect, right
     * after `myOpenForAutoOpen`) - which reads the participant's OWN nested `checkIns`, the one
     * with no `availableFrom` in this fixture (the discrepancy this file exists to describe). So
     * landing on the DEFAULT tab with this fixture and no `?open=1` now auto-opens too, same as
     * test 1 above - which is the new, correct behaviour, not a regression. This test is about the
     * HEADER's own honest reading of the (different, top-level) date, which does not depend on
     * which tab is active - so it lands on Context instead, to observe the header without also
     * triggering the Check-in tab's own auto-open.
     */
    renderPage('?tab=context')
    expect(await screen.findByText(/Your next session opens on/i)).toBeTruthy()
  })
})
