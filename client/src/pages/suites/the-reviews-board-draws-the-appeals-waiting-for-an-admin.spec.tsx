import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReviewsBoardPage } from './ReviewsBoardPage'
import { useAuthStore } from '@/stores/auth'
import type { AppealsToDecide } from '@/api/suites'

/**
 * THE REVIEW APPEAL IS DRAWN (engine workspace, 9 October): "Not drawn yet: the admin's list of
 * appeals (GET /suites/reviews/appeals) on Today and the reviews board." This is the board's half.
 * Every fact in the row is the server's own (`GET /suites/reviews/appeals`); the heading and
 * sentence are plain ones of this workspace's own, since the prototype has no wording for this yet.
 */
vi.mock('@/api/suites', () => ({
  reviewsApi: { board: vi.fn(), mine: vi.fn(), appealsToDecide: vi.fn() },
  suitesApi: { mine: vi.fn(async () => ({ leave: true, spend: true, time: true, reviews: true, any: true, says: '' })) },
}))
import { reviewsApi } from '@/api/suites'

const GRACE = { id: 'u-g', firstName: 'Grace', role: 'ADMIN', organizationName: 'Baridi Appliances' }
const WAIRIMU = { id: 'u-w', firstName: 'Wairimu', role: 'LEAD', organizationName: 'Baridi Appliances' }

function open(user: any) {
  useAuthStore.setState({ user, token: 't', isAuthenticated: true } as any)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/suite/reviews']}>
        <Routes><Route path="/suite/reviews" element={<ReviewsBoardPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const APPEALS: AppealsToDecide = {
  appeals: [{ id: 'r1', name: 'Imani Hassan', firstName: 'Imani', dueOn: '2027-03-01', appealedOn: '8 October', reviewerFirstName: 'Fatuma' }],
  waitingForAnotherAdmin: [],
}

beforeEach(() => {
  vi.clearAllMocks()
  ;(reviewsApi.board as any).mockResolvedValue({ every: 'Every 6 months', next: [] })
  ;(reviewsApi.mine as any).mockResolvedValue([])
})

describe('an admin reads the appeals waiting for them on the reviews board', () => {
  it('draws a row per appeal, naming who decided the review, with a way to open it', async () => {
    ;(reviewsApi.appealsToDecide as any).mockResolvedValue(APPEALS)
    open(GRACE)
    const region = await screen.findByRole('region', { name: 'Appeals waiting for you' })
    expect(within(region).getByText(/Imani Hassan has appealed the decision\./)).toBeInTheDocument()
    expect(within(region).getByText(/Fatuma decided it on 8 October\./)).toBeInTheDocument()
    expect(within(region).getByRole('link', { name: 'Open Imani Hassan’s appeal' })).toHaveAttribute('href', '/suite/reviews/r1')
  })

  it('draws nothing when there are none', async () => {
    ;(reviewsApi.appealsToDecide as any).mockResolvedValue({ appeals: [], waitingForAnotherAdmin: [] })
    open(GRACE)
    await screen.findByText('How a review is built')
    expect(screen.queryByRole('region', { name: 'Appeals waiting for you' })).toBeNull()
  })

  it('is never asked for a lead, who cannot decide an appeal', async () => {
    open(WAIRIMU)
    await screen.findByText('How a review is built')
    expect(reviewsApi.appealsToDecide).not.toHaveBeenCalled()
    expect(screen.queryByRole('region', { name: 'Appeals waiting for you' })).toBeNull()
  })
})
