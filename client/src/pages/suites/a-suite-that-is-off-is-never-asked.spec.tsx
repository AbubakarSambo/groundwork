import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TodayPage } from '../today/TodayPage'
import { YourRequestsPage } from './YourRequestsPage'
import { useAuthStore } from '@/stores/auth'
import { useSuitesKnownOffStore } from '@/stores/suites-known-off'
import { suitesApi, yourRequestsApi, reviewsApi } from '@/api/suites'

/**
 * JOURNEY WALK ROW 5: ABOUT 44 SCREENS LOGGED 404s FOR /suites/time/mine, /suites/spend/mine AND
 * /suites/reviews/mine. The routes exist; each answers 404 while its suite is off (B-198, a refusal
 * by design). The screens now read GET /suites/mine once, which never refuses, and ask a suite's own
 * route only while that suite is on.
 */
vi.mock('@/api/today', () => ({ todayApi: { get: vi.fn().mockResolvedValue({ count: 0, line: '', needs: [], comingUp: [] }), outstanding: vi.fn().mockResolvedValue(null) } }))
vi.mock('@/api/suites', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/suites')>()
  return {
    ...actual,
    suitesApi: { ...actual.suitesApi, mine: vi.fn() },
    yourRequestsApi: { ...actual.yourRequestsApi, leave: vi.fn(), spending: vi.fn(), hours: vi.fn() },
    reviewsApi: { ...actual.reviewsApi, mineQuietly: vi.fn() },
    queueApi: { get: vi.fn().mockRejectedValue(Object.assign(new Error('off'), { response: { status: 404 } })) },
  }
})

const AMANI = { id: 'u1', firstName: 'Amani', role: 'MEMBER', organizationId: 'o1', organizationName: 'Kilima Traders' }
const GRACE = { id: 'u2', firstName: 'Grace', role: 'ADMIN', organizationId: 'o1', organizationName: 'Kilima Traders' }

function mount(user: any, page: 'today' | 'mine') {
  useAuthStore.setState({ user, token: 't', isAuthenticated: true } as any)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{page === 'today' ? <TodayPage /> : <YourRequestsPage />}</MemoryRouter>
    </QueryClientProvider>,
  )
}

function suitesOn(on: { leave?: boolean; spend?: boolean; time?: boolean; reviews?: boolean }) {
  ;(suitesApi.mine as any).mockResolvedValue({ leave: false, spend: false, time: false, reviews: false, any: false, says: '', ...on })
}

beforeEach(() => {
  vi.clearAllMocks()
  useSuitesKnownOffStore.setState({ off: false, offByKey: {} })
  ;(yourRequestsApi.leave as any).mockResolvedValue({ daysLeftSaid: 'You have 16 days of leave left this year, out of 21.', requests: [] })
  ;(yourRequestsApi.spending as any).mockResolvedValue({ requests: [] })
  ;(yourRequestsApi.hours as any).mockResolvedValue({ weeks: [], standing: null })
  ;(reviewsApi.mineQuietly as any).mockResolvedValue([])
})

const settle = () => new Promise(r => setTimeout(r, 20))

describe('a suite that is off is never asked, on Today', () => {
  it('with every suite off, Today asks GET /suites/mine and none of the four suites', async () => {
    suitesOn({})
    mount(AMANI, 'today')
    await waitFor(() => expect(suitesApi.mine).toHaveBeenCalled())
    await settle()
    expect(yourRequestsApi.leave).not.toHaveBeenCalled()
    expect(yourRequestsApi.spending).not.toHaveBeenCalled()
    expect(yourRequestsApi.hours).not.toHaveBeenCalled()
    expect(reviewsApi.mineQuietly).not.toHaveBeenCalled()
  })

  it('with leave and reviews on, Today asks those two and not spending or hours', async () => {
    suitesOn({ leave: true, reviews: true })
    mount(AMANI, 'today')
    await waitFor(() => expect(yourRequestsApi.leave).toHaveBeenCalled())
    await waitFor(() => expect(reviewsApi.mineQuietly).toHaveBeenCalled())
    await settle()
    expect(yourRequestsApi.spending).not.toHaveBeenCalled()
    expect(yourRequestsApi.hours).not.toHaveBeenCalled()
  })
})

describe('a suite that is off is never asked, on your own Suites page', () => {
  it('Amani, a member, reads her leave, and the sections for the suites that are off are left out without asking them', async () => {
    suitesOn({ leave: true })
    mount(AMANI, 'mine')
    expect(await screen.findByText('You have 16 days of leave left this year, out of 21.')).toBeTruthy()
    await settle()
    expect(yourRequestsApi.spending).not.toHaveBeenCalled()
    expect(yourRequestsApi.hours).not.toHaveBeenCalled()
    expect(reviewsApi.mineQuietly).not.toHaveBeenCalled()
    expect(screen.queryByText('Your requests to spend')).toBeNull()
    expect(screen.queryByText('Your hours')).toBeNull()
  })

  it('Grace, an admin, is told the time sheets suite is off and where to switch it on, without its route being asked', async () => {
    suitesOn({ leave: true, spend: true })
    mount(GRACE, 'mine')
    expect(await screen.findByText('Your hours')).toBeTruthy()
    expect(screen.getByText(/The time sheets suite is not switched on\. You can switch it on under/)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Suites' })).toBeTruthy()
    await waitFor(() => expect(yourRequestsApi.spending).toHaveBeenCalled())
    expect(yourRequestsApi.hours).not.toHaveBeenCalled()
  })
})
