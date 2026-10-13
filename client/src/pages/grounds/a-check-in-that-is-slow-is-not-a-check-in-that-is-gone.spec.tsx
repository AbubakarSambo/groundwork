import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GroundAdminPage } from './GroundAdminPage'
import { GroundParticipantPage } from './GroundParticipantPage'
import { useAuthStore } from '@/stores/auth'
import { groundsApi } from '@/api/grounds'

/**
 * "A PAGE FLASHES FOR A SECOND AND THEN GOES TO THE CHECK-IN PAGE."
 *
 * The flashing page was this one's not-found state. It rendered on `!ground`, which is true both
 * when there is nothing yet and when there is definitely nothing - and the first of those includes
 * a request that failed and is about to be retried. React Query refetches, it works, and the real
 * page replaces it. From outside: a strange screen for a second right after opening a check-in.
 *
 * Could not be reproduced locally - the cache is warm and the server answers in single-digit
 * milliseconds - so it is tested here instead, where a failing request can be arranged on purpose.
 */
const ADMIN = {
  id: 'u1', email: 'a@b.test', firstName: 'Ada', lastName: '',
  role: 'ADMIN', organizationId: 'o1', organizationName: 'Org',
  organization: { id: 'o1', name: 'Org', email: 'ops@b.test' },
} as any

function show() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds/g1']}>
        <Routes><Route path="/grounds/:id" element={<GroundAdminPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('a check-in that is slow is not a check-in that is gone', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    useAuthStore.setState({ user: ADMIN, token: 't', isAuthenticated: true } as any)
  })

  it('does not say the check-in is gone when the request merely failed', async () => {
    /* A dropped connection, a token being refreshed, a cold server. Not a missing check-in. */
    const get = vi.spyOn(groundsApi, 'get').mockRejectedValue(Object.assign(new Error('network'), { response: undefined }))
    const { container } = show()

    /*
     * WAIT FOR THE FAILURE, NOT FOR THE WORD "LOADING". The first version waited for "Loading",
     * which is on screen from the very first render - so it resolved before the request had even
     * failed and passed identically with the bug restored. A guard that cannot be made to fail is
     * not a guard, and this one had to be broken on purpose before it was worth anything.
     */
    await waitFor(() => expect(get).toHaveBeenCalled())
    await waitFor(() => expect(container.textContent).toContain('We could not load this check-in'))

    /*
     * THIS ASSERTION USED TO READ `toContain('Loading')`, AND THAT WAS THE BUG WRITTEN DOWN.
     *
     * Sending a failed request to the loading state fixed the flashing, and left the page saying
     * "Loading..." for as long as anyone cared to watch. Driven in the browser with the endpoint
     * forced to 500: React Query tried twice, gave up, and the word stayed on screen with nothing
     * to press. Not gone, and not loading either - it could not be loaded, and it can be retried.
     */
    expect(container.textContent).not.toContain('Loading')
    expect(container.textContent).not.toContain('This check-in isn’t available any more')
    expect(container.textContent).toContain('Try again')
  })

  it('and trying again is what recovers it', async () => {
    /* The state is only honest if the button in it works. */
    const get = vi.spyOn(groundsApi, 'get').mockRejectedValue(Object.assign(new Error('network'), { response: undefined }))
    const { container, getByText } = show()
    await waitFor(() => expect(container.textContent).toContain('We could not load this check-in'))

    get.mockResolvedValue({
      id: 'g1', label: 'Atlas delivery', scenario: 'NEW_HIRE', moment: 'STARTING',
      status: 'ACTIVE', initiatorId: 'u1', organizationId: 'o1', participants: [], timelineDays: 90,
    } as any)
    getByText('Try again').click()

    await waitFor(() => expect(container.textContent).not.toContain('We could not load this check-in'))
    expect(container.textContent).not.toContain('This check-in isn’t available any more')
  })

  it('the party view does not accuse somebody of having been removed', async () => {
    /*
     * The same failure on `/grounds/:id/p` fell through to the same GroundGone, which reads
     * "it may belong to an organisation you have since switched away from, or it may simply not be one of yours". So a request that failed told a
     * party they had been taken out of a check-in. Observed in the browser before it was fixed.
     */
    vi.spyOn(groundsApi, 'get').mockRejectedValue(Object.assign(new Error('network'), { response: undefined }))
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { container } = render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/grounds/g1/p']}>
          <Routes><Route path="/grounds/:id/p" element={<GroundParticipantPage />} /></Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    await waitFor(() => expect(container.textContent).toContain('We could not load this check-in'))
    expect(container.textContent).not.toContain('no longer part of it')
    expect(container.textContent).toContain('You are still part of it')
  })

  it('still says so when the check-in really is gone', async () => {
    /* A 404 is the server saying it is not there, which is the one case worth the words. */
    vi.spyOn(groundsApi, 'get').mockRejectedValue(Object.assign(new Error('gone'), { response: { status: 404 } }))
    const { container } = show()
    await waitFor(() => expect(container.textContent).toContain('This check-in isn’t available any more'))
    expect(container.textContent).not.toContain('Loading')
  })

  it('and says so, the same words, when it is a 403 instead - B-110, GW-PRI-04', async () => {
    /* A 403 must read exactly like a 404 here: the only other true sentence for a 403 would say
       this check-in exists and simply is not this reader's, which tells a stranger holding a
       stale link that something real sits behind it - precisely what the 404 wording does not say. */
    vi.spyOn(groundsApi, 'get').mockRejectedValue(Object.assign(new Error('forbidden'), { response: { status: 403 } }))
    const { container } = show()
    await waitFor(() => expect(container.textContent).toContain('This check-in isn’t available any more'))
    expect(container.textContent).not.toContain('We could not load this check-in')
    expect(container.textContent).not.toContain('Loading')
  })

  it('stops loading, and does not say gone, once the check-in arrives', async () => {
    /*
     * Deliberately not asserting the whole page renders - this fixture is a check-in with the
     * minimum fields, and the page has its own gates about who may see what. What matters here is
     * only the pair of states this fix is about: it stops loading and it never says gone.
     */
    vi.spyOn(groundsApi, 'get').mockResolvedValue({
      id: 'g1', label: 'Atlas delivery', scenario: 'NEW_HIRE', moment: 'STARTING',
      status: 'ACTIVE', initiatorId: 'u1', organizationId: 'o1', participants: [], timelineDays: 90,
    } as any)
    const { container } = show()
    await waitFor(() => expect(container.textContent).not.toContain('Loading'))
    expect(container.textContent).not.toContain('This check-in isn’t available any more')
  })
})
