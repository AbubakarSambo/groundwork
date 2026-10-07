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
 * remembered for the rest of the session instead of asked again. These three reads now share it.
 */
vi.mock('@/api/today', () => ({ todayApi: { get: vi.fn().mockResolvedValue({ count: 0, line: '', needs: [], comingUp: [] }) } }))
vi.mock('@/api/suites', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/suites')>()
  return { ...actual, yourRequestsApi: { leave: vi.fn(), spending: vi.fn(), hours: vi.fn() } }
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
  useSuitesKnownOffStore.setState({ off: false })
  ;(todayApi.get as any).mockResolvedValue({ count: 0, line: '', needs: [], comingUp: [] })
})

describe('"your requests" reads, once an organisation has already said every suite is off', () => {
  it('remembers a 404 from any of the three and stops asking again this session', async () => {
    ;(yourRequestsApi.leave as any).mockRejectedValue({ response: { status: 404 } })
    ;(yourRequestsApi.spending as any).mockRejectedValue({ response: { status: 404 } })
    ;(yourRequestsApi.hours as any).mockRejectedValue({ response: { status: 404 } })
    const { unmount } = mount()
    await waitFor(() => expect(yourRequestsApi.leave).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(useSuitesKnownOffStore.getState().off).toBe(true))
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
    expect(useSuitesKnownOffStore.getState().off).toBe(false)
  })
})
