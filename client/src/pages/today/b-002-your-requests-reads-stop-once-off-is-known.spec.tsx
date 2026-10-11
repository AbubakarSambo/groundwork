import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TodayPage } from './TodayPage'
import { useAuthStore } from '@/stores/auth'
import { useSuitesKnownOffStore } from '@/stores/suites-known-off'
import { todayApi } from '@/api/today'
import { yourRequestsApi } from '@/api/suites'

/**
 * B-002: /today FIRED THREE REAL, FAILED REQUESTS - GET /suites/leave/mine, /spend/mine and
 * /time/mine - FOR EVERY ORGANISATION WITH NO SUITE SWITCHED ON (almost every brand-new one),
 * every time their 60-second cache went stale on every visit to the page.
 *
 * `stores/suites-known-off.ts` already exists to fix exactly this for the sidebar's queue read
 * (screen fault 11, AppShell.tsx): there is nowhere cheap to ask first, so the first 404 is
 * remembered instead of asked again. These three reads now share the per-suite form of it,
 * `offByKey`.
 *
 * UPDATED (8 October, nothing-removed audit S2): the first fix remembered one shared flag for all
 * three reads, so a single 404 (from a suite that really was off) also silenced the other two for
 * the rest of the session once their own cached "on" answers went stale - taking away the link
 * entirely for an organisation with, say, leave on and time sheets off. This file's first test used
 * to prove that shared behaviour; it now proves the per-suite version (`offByKey`), and a second
 * test below proves the restored case: one suite 404s, the other two keep asking normally.
 */
vi.mock('@/api/today', () => ({ todayApi: { get: vi.fn().mockResolvedValue({ count: 0, line: '', needs: [], comingUp: [] }), outstanding: vi.fn().mockResolvedValue(null) } }))
vi.mock('@/api/suites', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/suites')>()
  return { ...actual, suitesApi: { ...actual.suitesApi, mine: vi.fn(async () => ({ leave: true, spend: true, time: true, reviews: true, any: true, says: '' })) }, yourRequestsApi: { leave: vi.fn(), spending: vi.fn(), hours: vi.fn() } }
})

const MEMBER = { id: 'u1', email: 'amani@kilima.test', firstName: 'Amani', role: 'MEMBER', organizationName: 'Kilima Traders' }

function mount() {
  useAuthStore.setState({ user: MEMBER, token: 't', isAuthenticated: true } as any)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/today']}><TodayPage /></MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  useSuitesKnownOffStore.setState({ off: false, offByKey: {} })
  ;(todayApi.get as any).mockResolvedValue({ count: 0, line: '', needs: [], comingUp: [] })
})

describe('"your requests" reads, once an organisation has already said a suite is off', () => {
  it('remembers a 404 from each of the three and stops asking again this session', async () => {
    ;(yourRequestsApi.leave as any).mockRejectedValue({ response: { status: 404 } })
    ;(yourRequestsApi.spending as any).mockRejectedValue({ response: { status: 404 } })
    ;(yourRequestsApi.hours as any).mockRejectedValue({ response: { status: 404 } })
    const { unmount } = mount()
    await waitFor(() => expect(yourRequestsApi.leave).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(useSuitesKnownOffStore.getState().offByKey).toEqual({ leave: true, spending: true, hours: true }))
    unmount()

    /* A later visit to the page, after the cache (or the page itself) has gone - the store already
       knows, so none of the three asks again. */
    mount()
    await new Promise(r => setTimeout(r, 10))
    expect(yourRequestsApi.leave).toHaveBeenCalledTimes(1)
    expect(yourRequestsApi.spending).toHaveBeenCalledTimes(1)
    expect(yourRequestsApi.hours).toHaveBeenCalledTimes(1)
  })

  it('still asks normally when it has not learned the answer yet', async () => {
    ;(yourRequestsApi.leave as any).mockResolvedValue({ waiting: [], approved: [], daysLeftSaid: null, requests: [] })
    ;(yourRequestsApi.spending as any).mockResolvedValue({ waiting: [], approved: [] })
    ;(yourRequestsApi.hours as any).mockResolvedValue({ weeks: [], standing: null })
    mount()
    await waitFor(() => expect(yourRequestsApi.leave).toHaveBeenCalled())
    expect(useSuitesKnownOffStore.getState().offByKey).toEqual({})
  })

  /**
   * RESTORED (8 October, nothing-removed audit S2): A SUITE THAT HAS NOT 404'D KEEPS ASKING, EVEN
   * WHILE ANOTHER ALREADY HAS. Before this fix, one 404 (time sheets, here) marked every suite off
   * for the rest of the session, so leave stopped being asked about even though it was never told
   * no - and once its own cached "on" answer went stale, the link would have disappeared for an
   * organisation that still has leave switched on.
   */
  it('keeps asking a suite that has not 404d, even once another has', async () => {
    ;(yourRequestsApi.leave as any).mockResolvedValue({ waiting: [], approved: [], daysLeftSaid: null, requests: [] })
    ;(yourRequestsApi.spending as any).mockResolvedValue({ waiting: [], approved: [] })
    ;(yourRequestsApi.hours as any).mockRejectedValue({ response: { status: 404 } })
    const { unmount } = mount()
    await waitFor(() => expect(yourRequestsApi.hours).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(useSuitesKnownOffStore.getState().offByKey).toEqual({ hours: true }))
    unmount()

    /* A later visit: hours stays silenced, but leave and spending - never told no - ask again. */
    mount()
    await waitFor(() => expect(yourRequestsApi.leave).toHaveBeenCalledTimes(2))
    expect(yourRequestsApi.spending).toHaveBeenCalledTimes(2)
    expect(yourRequestsApi.hours).toHaveBeenCalledTimes(1)
  })
})
