import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BillingPage } from './BillingPage'
import { billingApi, fetchPricing } from '@/api/billing'
import { groundsApi } from '@/api/grounds'

/**
 * A HIDDEN LINK IS NOT A PERMISSION.
 *
 * `AppShell` marks Billing `adminOnly`, and that was the only thing keeping anybody off this page:
 * the route is `RequireAuth` alone and the component never looked at `user.role`. Signed in as a
 * plain participant on a ground and typing `/billing`, the whole page rendered - the organisation's
 * plan, its grounds, the ladder from $25 to $400 a month with live Subscribe buttons, and the
 * access-code tools.
 *
 * The SERVER was fine: every mutation on BillingController carries `@Roles(Role.ADMIN)`, so a member
 * could not actually have subscribed the organisation. What was wrong is being OFFERED it. A control
 * you are not allowed to use should not be on your screen, and a member who clicks Subscribe and
 * gets a refusal has been told something untrue about their own authority.
 *
 * Found by signing in as a participant and typing the address - which is exactly what somebody being
 * reviewed has a motive to do.
 */
vi.mock('@/api/billing', () => ({
  billingApi: {
    status: vi.fn(), getContributorCodes: vi.fn(), generateContributorCode: vi.fn(),
    sendContributorCodeToEmail: vi.fn(), createSubscription: vi.fn(),
    cancelSubscription: vi.fn(), pauseSubscription: vi.fn(), resumeSubscription: vi.fn(),
  },
  PLAN_LABELS: {}, PLAN_PRICES: {}, PLAN_MEMBER_CAPS: {},
  /** Live pricing: gated on isAdmin like the rest, so a member must not trigger it either. */
  fetchPricing: vi.fn(), formatPlanPrice: (c: number) => `$${c / 100}/mo`, FREE_GROUND_LIMIT: 10,
}))
vi.mock('@/api/grounds', () => ({ groundsApi: { list: vi.fn() } }))

let role = 'MEMBER'
vi.mock('@/stores/auth', () => ({
  useAuthStore: (sel: any) => sel({ user: { id: 'u1', role, organizationId: 'o1' } }),
}))

function renderBilling() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/billing']}><BillingPage /></MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  ;(billingApi.status as any).mockResolvedValue({ subscription: null, people: {}, activeGrounds: [] })
  ;(billingApi.getContributorCodes as any).mockResolvedValue([])
  ;(groundsApi.list as any).mockResolvedValue([])
})

describe('a member who types the URL', () => {
  beforeEach(() => { role = 'MEMBER' })

  it('is refused the page, not just the link', async () => {
    renderBilling()
    await waitFor(() => expect(screen.getByText(/need admin access to manage billing/i)).toBeTruthy())
  })

  it('and is offered no way to spend the organisation\'s money', async () => {
    renderBilling()
    await waitFor(() => screen.getByText(/need admin access/i))
    expect(screen.queryByText(/Subscribe/)).toBeNull()
    expect(screen.queryByText(/Upgrade your organisation/)).toBeNull()
    expect(screen.queryByText(/Access codes/)).toBeNull()
  })

  it('and no refused request is even sent', async () => {
    /**
     * This is also what removed the pair of overlapping "Access denied" toasts: two admin-only reads
     * failed and rendered two stacked toasts that truncated each other. A request never made cannot
     * fail, so gating the reads fixes the leak and the mess in one move.
     */
    renderBilling()
    await waitFor(() => screen.getByText(/need admin access/i))
    expect(billingApi.status).not.toHaveBeenCalled()
    expect(billingApi.getContributorCodes).not.toHaveBeenCalled()
    expect(groundsApi.list).not.toHaveBeenCalled()
    /** Added when prices became a live read: a new fetch on this page must be gated like the rest. */
    expect(fetchPricing).not.toHaveBeenCalled()
  })
})

describe('an admin', () => {
  beforeEach(() => { role = 'ADMIN' })

  it('still gets the real page', async () => {
    renderBilling()
    await waitFor(() => expect(screen.getByText(/Manage sessions for your grounds/i)).toBeTruthy())
    expect(screen.queryByText(/need admin access/i)).toBeNull()
  })

  it('and the reads do run for them', async () => {
    renderBilling()
    await waitFor(() => expect(billingApi.status).toHaveBeenCalled())
  })
})
