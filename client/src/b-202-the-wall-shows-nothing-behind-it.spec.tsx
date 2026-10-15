import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

/**
 * B-202 (review round 2), TWO FAULTS IN THE SAME WALL, COVERED SEPARATELY FROM
 * b-202-waiting-is-not-shown-today.spec.tsx (which covers the ORIGINAL redirect-to-"Almost in"
 * behaviour):
 *
 * (a) `RequireOrgSetup` used to render its protected page while the first read of `my-waiting` was
 *     still in flight, so a waiting person briefly saw the real page (and the real page's own
 *     requests fired) before the redirect caught up. Nothing behind the wall renders, and nothing
 *     behind it is asked for, until the first answer is in - except a failed read lets the person
 *     through rather than locking everyone out of the product because one read failed.
 *
 * (b) A cached `waiting: true` - the same `['my-waiting']` key `WaitingForAnAdminPage` reads - must
 *     not be acted on until a fetch for the CURRENT mount has actually resolved; a stale cached
 *     `true`, from before an admin let them in, must not bounce them straight back to "Almost in"
 *     before the fresh "you're in" answer has had a chance to arrive.
 */
const waiting = vi.hoisted(() => ({ fn: vi.fn() }))
vi.mock('@/api/auth', async (orig) => {
  const real = await orig<any>()
  return { ...real, authApi: { ...real.authApi, myWaiting: waiting.fn } }
})
import { RequireOrgSetup } from './App'
import { useAuthStore } from '@/stores/auth'

function renderWall(qc: QueryClient) {
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/today']}>
        <Routes>
          <Route
            path="/today"
            element={
              <RequireOrgSetup>
                <p>Today's real page, with its own requests already fired</p>
              </RequireOrgSetup>
            }
          />
          <Route path="/join/waiting" element={<p>Almost in</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore.setState({
    user: { id: 'u1', firstName: 'Taji', email: 'taji@elsewhere.test', role: 'MEMBER' } as any,
    token: 't', isAuthenticated: true,
  })
})

afterEach(() => {
  useAuthStore.setState({ user: null, token: null, isAuthenticated: false })
})

describe('(a) nothing behind the wall renders while the first read is in flight', () => {
  it('shows neither the real page nor "Almost in" before the answer arrives, then the real page once it is not waiting', async () => {
    let resolve!: (v: any) => void
    waiting.fn.mockReturnValue(new Promise(r => { resolve = r }))
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    renderWall(qc)

    expect(screen.queryByText(/Today's real page/)).toBeNull()
    expect(screen.queryByText('Almost in')).toBeNull()

    resolve({ waiting: false })
    expect(await screen.findByText(/Today's real page/)).toBeTruthy()
  })

  it('lets the person through rather than locking them out when the read fails', async () => {
    waiting.fn.mockRejectedValue(new Error('network'))
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    renderWall(qc)
    expect(await screen.findByText(/Today's real page/)).toBeTruthy()
  })
})

describe('(b) a cached "waiting: true" is not trusted until this mount\'s own fetch has settled', () => {
  it('does not bounce back to "Almost in" on a stale cached true while a fresh (now false) answer is still in flight', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    // The cache already holds `waiting: true`, the way WaitingForAnAdminPage's own read of the
    // same key would leave it, from before an admin let them in.
    qc.setQueryData(['my-waiting'], { waiting: true })

    let resolve!: (v: any) => void
    waiting.fn.mockReturnValue(new Promise(r => { resolve = r }))
    renderWall(qc)

    // Stale "true" must not fire the redirect while the fresh read is still outstanding.
    expect(screen.queryByText('Almost in')).toBeNull()

    resolve({ waiting: false })
    expect(await screen.findByText(/Today's real page/)).toBeTruthy()
    expect(screen.queryByText('Almost in')).toBeNull()
  })

  it('does redirect once a confirmed (not merely cached) "waiting: true" has actually settled', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    waiting.fn.mockResolvedValue({ waiting: true })
    renderWall(qc)
    expect(await screen.findByText('Almost in')).toBeTruthy()
  })
})
