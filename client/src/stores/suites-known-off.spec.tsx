import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppShell } from '@/components/gw/AppShell'
import { useAuthStore } from '@/stores/auth'
import { useSuitesKnownOffStore } from './suites-known-off'
import { queueApi } from '@/api/suites'

/**
 * SCREEN FAULT 11: THE SUITES READ WENT OUT ON EVERY PAGE, EVEN WITH BOTH SUITES OFF.
 *
 * `GET /suites/queue` answers 404 for an organisation with neither suite on - quiet now, but still
 * a real request, repeated as its 30-second cache went stale on whatever page a member happened to
 * be on. The first 404 now sets `useSuitesKnownOffStore`, and the sidebar's own read stops asking
 * again for the rest of the session.
 */
vi.mock('@/api/suites', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/suites')>()
  return { ...actual, queueApi: { get: vi.fn() } }
})

const MEMBER = { id: 'u1', email: 'amani@kilima.test', firstName: 'Amani', role: 'MEMBER', organizationName: 'Kilima Traders' }

function mount(suitesOn: Record<string, unknown> = { leave: true, spend: false, time: false, reviews: false, any: true, says: '' }) {
  useAuthStore.setState({ user: MEMBER, token: 't', isAuthenticated: true } as any)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
  /* B-202 (review round 3): AppShell now waits for the same ['my-waiting'] read RequireOrgSetup
  already makes before it mounts the sidebar at all - without this cached answer the real
  authApi.myWaiting (not mocked in this file) would be asked for real. */
  qc.setQueryData(['my-waiting'], { waiting: false })
  qc.setQueryData(['grounds'], [])
  qc.setQueryData(['my-organizations'], [])
  /* Which suites are on, read once (useSuitesOnForYou): the queue is asked only once leave or spending is on. */
  qc.setQueryData(['suites-on-for-you', null], suitesOn)
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds']}><AppShell><div>page content</div></AppShell></MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('the sidebar’s suites read, once an organisation has already said no', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useSuitesKnownOffStore.setState({ off: false })
  })

  it('remembers a 404 and stops asking again this session', async () => {
    ;(queueApi.get as any).mockRejectedValue({ response: { status: 404 } })
    const { unmount } = mount()
    await waitFor(() => expect(queueApi.get).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(useSuitesKnownOffStore.getState().off).toBe(true))
    unmount()

    /* A second page, later - the shell remounts, as it would navigating between pages whose cache
       has gone stale, but the store already knows. */
    mount()
    await new Promise(r => setTimeout(r, 10))
    expect(queueApi.get).toHaveBeenCalledTimes(1)
  })

  /* The journey of 12 October: with neither leave nor spending on, the queue is never asked at all. */
  it('never asks while neither leave nor spending is on', async () => {
    ;(queueApi.get as any).mockResolvedValue({ counts: { all: 0, leave: 0, spend: 0, pastTheDeadline: 0 }, page: 1, pageSize: 1, pages: 1, items: [], says: '' })
    mount({ leave: false, spend: false, time: false, reviews: false, any: false, says: '' })
    await new Promise(r => setTimeout(r, 20))
    expect(queueApi.get).not.toHaveBeenCalled()
  })

  it('still asks normally when it has not learned the answer yet', async () => {
    ;(queueApi.get as any).mockResolvedValue({ counts: { all: 2, leave: 1, spend: 1, pastTheDeadline: 0 }, page: 1, pageSize: 1, pages: 1, items: [], says: '' })
    mount()
    await waitFor(() => expect(queueApi.get).toHaveBeenCalled())
    expect(useSuitesKnownOffStore.getState().off).toBe(false)
  })
})
