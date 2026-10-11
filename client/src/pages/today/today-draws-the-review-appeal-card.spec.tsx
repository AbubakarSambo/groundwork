import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TodayPage } from './TodayPage'
import { useAuthStore } from '@/stores/auth'

/**
 * THE REVIEW APPEAL IS DRAWN (engine workspace, 9 October): "Not drawn yet: ... the person's card
 * on Today (mayAppeal, appealSays)." `GET /suites/reviews/mine` already carries both; this reads
 * it again on Today (the same call the reviews board already makes for "Your reviews") and draws a
 * row for a review with something to say about an appeal - the server's own sentence, nothing said
 * twice with the generic review item `GET /today` already draws.
 */
vi.mock('@/api/today', () => ({ todayApi: { get: vi.fn().mockResolvedValue({ count: 0, line: '', needs: [], comingUp: [] }), everywhere: vi.fn(), outstanding: vi.fn().mockResolvedValue(null) } }))
vi.mock('@/api/suites', () => ({
  reviewsApi: { mineQuietly: vi.fn() },
  suitesApi: { mine: vi.fn(async () => ({ leave: true, spend: true, time: true, reviews: true, any: true, says: '' })) },
  yourRequestsApi: { leave: vi.fn().mockRejectedValue({ response: { status: 404 } }), spending: vi.fn().mockRejectedValue({ response: { status: 404 } }), hours: vi.fn().mockRejectedValue({ response: { status: 404 } }) },
}))
import { reviewsApi } from '@/api/suites'

function open(user: any) {
  useAuthStore.setState({ user, token: 't', isAuthenticated: true } as any)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/today']}>
        <TodayPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const AISHA = { id: 'u-a', firstName: 'Aisha', role: 'MEMBER', organizationName: 'Baridi Appliances' }

beforeEach(() => vi.clearAllMocks())

describe('a person reads their own review appeal on Today', () => {
  it('draws the server’s own sentence, with a way to it, once an appeal is made', async () => {
    ;(reviewsApi.mineQuietly as any).mockResolvedValue([
      { id: 'r1', dueOn: '2027-03-01', writtenWithFirstName: 'Wairimu', stands: 'decided', says: 'Wairimu decided your review.', mayAppeal: false, appealStands: 'with-an-admin', appealSays: 'You have appealed this decision. An admin other than Wairimu reads your reasons and decides. You can add to your reasons until then.' },
    ])
    open(AISHA)
    const region = await screen.findByRole('region', { name: 'Your review appeal' })
    expect(region.textContent).toContain('You have appealed this decision. An admin other than Wairimu reads your reasons and decides.')
    expect(screen.getByRole('link', { name: 'Open your appeal' })).toHaveAttribute('href', '/suite/reviews')
  })

  it('draws nothing when there is no review to appeal', async () => {
    ;(reviewsApi.mineQuietly as any).mockResolvedValue([
      { id: 'r1', dueOn: '2027-03-01', writtenWithFirstName: 'Wairimu', stands: 'started', says: 'Wairimu has started your review.' },
    ])
    open(AISHA)
    await screen.findByText('Nothing needs you right now.')
    expect(screen.queryByRole('region', { name: 'Your review appeal' })).toBeNull()
  })

  it('offers to appeal a freshly decided review that has not been appealed yet', async () => {
    ;(reviewsApi.mineQuietly as any).mockResolvedValue([
      { id: 'r1', dueOn: '2027-03-01', writtenWithFirstName: 'Wairimu', stands: 'decided', says: 'Wairimu decided your review.', mayAppeal: true, appealStands: null, appealSays: null },
    ])
    open(AISHA)
    const region = await screen.findByRole('region', { name: 'Your review appeal' })
    expect(region.textContent).toContain('You can appeal this decision.')
    expect(screen.getByRole('link', { name: 'Appeal this decision' })).toHaveAttribute('href', '/suite/reviews')
  })
})
