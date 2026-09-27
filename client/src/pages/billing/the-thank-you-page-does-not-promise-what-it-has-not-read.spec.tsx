import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { BillingCallbackPage } from './BillingCallbackPage'

/**
 * THE THANK-YOU PAGE DOES NOT PROMISE WHAT IT HAS NOT READ.
 *
 * It asserted "You are now on the Team plan" from the plan Stripe put in the URL, before the webhook
 * that activates the plan had landed. Now it says the payment was received, asks the server, and
 * names the plan only once the server does.
 */
const m = vi.hoisted(() => ({ status: vi.fn() }))
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: { id: 'u1', role: 'ADMIN', organization: { name: 'Baridi Appliances' } } }) }))
vi.mock('@/api/billing', async () => {
  const actual = await vi.importActual<typeof import('@/api/billing')>('@/api/billing')
  return { ...actual, billingApi: { status: m.status } }
})

const renderAt = (url: string) => render(<MemoryRouter initialEntries={[url]}><BillingCallbackPage /></MemoryRouter>)

describe('after a subscription checkout', () => {
  beforeEach(() => vi.clearAllMocks())

  it('does not name the plan from the URL while the server has not confirmed it', async () => {
    m.status.mockResolvedValue({ subscription: { plan: null, status: null } })
    renderAt('/billing/callback?status=success&type=subscription&plan=TEAM')
    expect(await screen.findByText(/Payment received\. Activating/)).toBeTruthy()
    expect(screen.queryByText(/^Done\./)).toBeNull()
    expect(screen.queryByText(/Unlimited check-ins/)).toBeNull()
  })

  /* U.19: in the prototype's words (settings-paid.txt), still only once the server reports it. */
  it('names the plan once the server reports it active', async () => {
    m.status.mockResolvedValue({ subscription: { plan: 'GROWTH', status: 'active' }, people: { count: 27, cap: 100 } })
    renderAt('/billing/callback?status=success&type=subscription&plan=GROWTH')
    await waitFor(() => expect(screen.getByText('Done. Baridi Appliances is on Growth.')).toBeTruthy())
    expect(screen.getByText('All 27 people can check in.')).toBeTruthy()
    expect(screen.getByText('Back to Plan and billing')).toBeTruthy()
    expect(m.status).toHaveBeenCalled()
  })

})

describe('after any other payment', () => {
  it('says the payment was received and claims nothing about what it bought', () => {
    renderAt('/billing/callback?status=success&type=session_fee&groundId=g1')
    expect(screen.getByText('Payment received.')).toBeTruthy()
    expect(screen.queryByText(/session added/i)).toBeNull()
  })
})

describe('when somebody comes back from Stripe without paying (U.19)', () => {
  it('reads the prototype’s words, with a way to try again and a way to ask', () => {
    renderAt('/billing/callback?status=cancelled')
    expect(screen.getByText('The payment didn’t go through')).toBeTruthy()
    expect(screen.getByText('You haven’t been charged, and your plan hasn’t changed.')).toBeTruthy()
    expect(screen.getByText('Try another card').getAttribute('href')).toBe('/billing')
    expect(screen.getByText('Talk to us').getAttribute('href')).toBe('/talk-to-us')
    expect(document.body.textContent).not.toMatch(/bank declined/i)
  })
})
