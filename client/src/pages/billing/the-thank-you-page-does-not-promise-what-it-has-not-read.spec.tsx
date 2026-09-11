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
    expect(screen.queryByText(/You are on the/)).toBeNull()
    expect(screen.queryByText(/Unlimited check-ins/)).toBeNull()
  })

  it('names the plan once the server reports it active', async () => {
    m.status.mockResolvedValue({ subscription: { plan: 'TEAM', status: 'active' } })
    renderAt('/billing/callback?status=success&type=subscription&plan=TEAM')
    await waitFor(() => expect(screen.getByText(/You are on the .* plan\./)).toBeTruthy())
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
