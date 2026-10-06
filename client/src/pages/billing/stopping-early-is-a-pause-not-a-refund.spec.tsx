import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BillingPage } from './BillingPage'

/**
 * STOPPING EARLY IS A PAUSE, NOT A REFUND.
 *
 * The cancel button sat behind a window.confirm that said the team "will move to per-session
 * billing" - a mode that no longer exists - and then ended the subscription that moment. Now the
 * confirmation says the real consequence (everything works until the period end, then stops), offers
 * pause in the same place for somebody who wants to stop paying sooner, and a scheduled end can be
 * kept instead.
 *
 * U.19: the two buttons read "Pause" and "Cancel", under "Stopping", as the prototype's Plan and
 * billing has them (settings-billing.txt), so this finds them by those words. What they do is unchanged.
 */
/* Hoisted, because vi.mock factories run before the file's own top-level statements. */
const m = vi.hoisted(() => ({
  cancelSubscription: vi.fn().mockResolvedValue({ endsAt: '2026-09-30T00:00:00.000Z' }),
  pauseSubscription: vi.fn().mockResolvedValue({}),
  keepSubscription: vi.fn().mockResolvedValue({}),
  state: { subscription: { plan: 'TEAM', status: 'active', periodEnd: '2026-09-30T00:00:00.000Z', endsAt: null as string | null, freeExtensionUsed: false } },
}))
const { cancelSubscription, pauseSubscription, keepSubscription } = m

vi.mock('@/stores/auth', () => ({
  useAuthStore: (sel: any) => sel({ user: { id: 'u1', role: 'ADMIN', organizationId: 'o1' } }),
}))
vi.mock('@/api/grounds', () => ({ groundsApi: { list: vi.fn().mockResolvedValue([]) } }))
vi.mock('@/api/billing', async () => {
  const actual = await vi.importActual<typeof import('@/api/billing')>('@/api/billing')
  return {
    ...actual,
    billingApi: {
      status: vi.fn().mockImplementation(async () => ({ subscription: m.state.subscription, people: { count: 3, cap: 20 }, activeGrounds: [], card: null })),
      getContributorCodes: vi.fn().mockResolvedValue([]),
      cancelSubscription: m.cancelSubscription,
      pauseSubscription: m.pauseSubscription,
      keepSubscription: m.keepSubscription,
      resumeSubscription: vi.fn(),
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

describe('cancelling a subscription', () => {
  beforeEach(() => { vi.clearAllMocks(); m.state.subscription = { ...m.state.subscription, endsAt: null } })

  it('asks first, says when access stops, and offers pause in the same place', async () => {
    renderBilling()
    fireEvent.click(await screen.findByText('Cancel'))
    const dialog = await screen.findByRole('dialog', { name: /cancel at the end of the period/i })
    expect(dialog.textContent).toMatch(/keeps working until/i)
    expect(dialog.textContent).toMatch(/then it stops/i)
    expect(dialog.textContent).toMatch(/pause instead/i)
    expect(dialog.textContent).not.toMatch(/per-session/i)
    expect(cancelSubscription).not.toHaveBeenCalled()
  })

  it('ends it at the period end only when they say so', async () => {
    renderBilling()
    fireEvent.click(await screen.findByText('Cancel'))
    fireEvent.click(await screen.findByText(/^End it on /))
    await waitFor(() => expect(cancelSubscription).toHaveBeenCalledTimes(1))
  })

  it('"pause instead" pauses, and cancels nothing', async () => {
    renderBilling()
    fireEvent.click(await screen.findByText('Cancel'))
    fireEvent.click(await screen.findByText('Pause instead'))
    await waitFor(() => expect(pauseSubscription).toHaveBeenCalledTimes(1))
    expect(cancelSubscription).not.toHaveBeenCalled()
  })

  it('pausing has its own confirmation that says what it does', async () => {
    renderBilling()
    fireEvent.click(await screen.findByText('Pause'))
    const dialog = await screen.findByRole('dialog', { name: /pause the subscription/i })
    expect(dialog.textContent).toMatch(/nothing is charged while it is paused/i)
    expect(dialog.textContent).toMatch(/starts again when you press resume/i)
    expect(pauseSubscription).not.toHaveBeenCalled()
  })
})

describe('a subscription that is ending', () => {
  beforeEach(() => { vi.clearAllMocks(); m.state.subscription = { ...m.state.subscription, endsAt: '2026-09-30T00:00:00.000Z' } })

  it('says so, and offers to keep it rather than to cancel it again', async () => {
    renderBilling()
    expect((await screen.findByText(/^Ending on /)).textContent).toMatch(/everything works until then/i)
    fireEvent.click(await screen.findByText('Keep subscription'))
    await waitFor(() => expect(keepSubscription).toHaveBeenCalledTimes(1))
    expect(screen.queryByText('Cancel')).toBeNull()
  })
})
