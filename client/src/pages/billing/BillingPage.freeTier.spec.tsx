import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BillingPage } from './BillingPage'

/**
 * Bug 6 guard: the org-level BillingPage used to render the stale
 * per-session model - a "Per-session billing. $5 per session." card and a
 * "Buy a session ($5)" button - for any org that was not subscribed. But
 * since PR #40 a non-subscribed org IS the free tier (10 Grounds,
 * unlimited sessions/reports), so that $5 UI is a dead, contradictory
 * charge surface (the 4th one #40 missed). This asserts the free /
 * non-subscribed billing state shows the real free-tier framing and NOT
 * the $5 / buy-a-session UI. Revert the fix -> "$5" / "Buy a session"
 * reappear -> this bites.
 */

vi.mock('@/api/grounds', () => ({ groundsApi: { list: vi.fn().mockResolvedValue([]) } }))
vi.mock('@/api/billing', async () => {
  const actual = await vi.importActual<typeof import('@/api/billing')>('@/api/billing')
  return {
    ...actual,
    billingApi: {
      status: vi.fn().mockResolvedValue({ activeGrounds: [] }),
      getContributorCodes: vi.fn().mockResolvedValue([]),
    },
  }
})

function renderBilling() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/billing']}>
        <BillingPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('BUG6: free-tier billing page has no $5 / buy-a-session UI', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows the real free-tier framing on a non-subscribed org', async () => {
    renderBilling()
    await waitFor(() => {
      expect(screen.getByText(/Your first 10 Grounds are free/i)).toBeTruthy()
    })
  })

  it('does NOT render a "$5 per session" card or a "Buy a session" button', async () => {
    renderBilling()
    await waitFor(() => {
      expect(screen.getByText(/Your first 10 Grounds are free/i)).toBeTruthy()
    })
    expect(screen.queryByText(/Buy a session/i)).toBeNull()
    expect(screen.queryByText(/per session/i)).toBeNull()
    expect(screen.queryByText(/\$5\b/)).toBeNull()
  })
})
