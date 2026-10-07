import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PricingPage } from './PricingPage'

/**
 * THE PRICING PAGE, AS EACH PERSON READS IT (F2, U.19).
 *
 * U.1 found that a visitor who is not signed in was told the free plan was "Your current plan". It is
 * nobody's until they sign up. The plans and prices come from the pricing table, the free limits and
 * the trial from the platform settings; the trial says its one shared sentence only while it is on.
 */
const m = vi.hoisted(() => ({ user: null as any, status: {} as any, pricing: {} as any }))

vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ user: m.user }) }))
vi.mock('@/api/billing', async () => {
  const actual = await vi.importActual<typeof import('@/api/billing')>('@/api/billing')
  return {
    ...actual,
    billingApi: {
      status: vi.fn().mockImplementation(async () => m.status),
      getPricing: vi.fn().mockImplementation(async () => m.pricing),
      createSubscription: vi.fn(),
    },
  }
})

const PLANS = [
  { plan: 'STARTER', amountCents: 2500, memberCap: 5 },
  { plan: 'SMALL_TEAM', amountCents: 9000, memberCap: 20 },
  { plan: 'GROWTH', amountCents: 41000, memberCap: 100 },
  { plan: 'BUSINESS', amountCents: 90000, memberCap: 250 },
  { plan: 'SCALE', amountCents: 165000, memberCap: 500 },
  { plan: 'ENTERPRISE', amountCents: null, memberCap: null },
].map((p) => ({ ...p, label: p.plan, hasStripePrice: true, updatedAt: '' }))

function renderIt() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/pricing']}><PricingPage /></MemoryRouter>
    </QueryClientProvider>,
  )
}
const text = () => document.body.textContent ?? ''
const FREE = { subscription: { plan: null, status: null }, people: { count: 3, cap: 5 }, onTheHouse: null }

beforeEach(() => {
  m.user = null
  m.status = {}
  m.pricing = { plans: PLANS, free: { groundLimit: 10, memberLimit: 5 }, trial: { on: false, teamsUnder: 20, months: 1 } }
})

describe('a visitor who is not signed in', () => {
  it('is never told the free plan is theirs', async () => {
    renderIt()
    /* $410, not the shipped $400: the page reads the table, not a number of its own.
       Screen fault 11 (final walk): "$410/mo" drawn as plain text became "$410 a month" -
       the currency symbol and the number are kept, "/mo" becomes the plain words. */
    await waitFor(() => expect(text()).toContain('$410 a month'))
    expect(text()).not.toContain('Your current plan')
    expect(text()).toContain('Start free with 10 check-ins, for teams of 5 or fewer, including you. Subscribe as your team grows. Unlimited sessions and reports on every plan.')
    expect(text()).toContain('For small teams getting each person’s own account written down.')
  })

  it('reads nothing about a free trial while it is off, and none of the lines that were not true', async () => {
    renderIt()
    await waitFor(() => expect(text()).toContain('$410 a month'))
    expect(text()).not.toMatch(/months free|Teams of fewer than/)
    expect(text()).not.toMatch(/no trial that expires|No proration surprises/)
  })

  it('while the switch is off, reads the free plan as today, but never as theirs', async () => {
    renderIt()
    await waitFor(() => expect(text()).toContain('$410 a month'))
    expect(text()).toContain('forever')
    expect(text()).not.toContain('Your current plan')
  })

  it('once the switch is on, the free plan is not offered at all (Hafsah, 27 September)', async () => {
    m.pricing = { ...m.pricing, trial: { on: true, teamsUnder: 20, months: 1 } }
    renderIt()
    await waitFor(() => expect(text()).toContain('1 month free'))
    expect(text()).not.toMatch(/forever|Start free with|Your current plan|Included with every plan/)
  })

  it('reads the one shared sentence and the trial’s card once it is switched on', async () => {
    m.pricing = { ...m.pricing, trial: { on: true, teamsUnder: 20, months: 1 } }
    renderIt()
    await waitFor(() => expect(text()).toContain('Teams of fewer than 20 people get 1 month free. No card needed. Subscribe as your team grows.'))
    expect(text()).toContain('1 month free')
    expect(text()).toContain('$0 for 1 month')
    expect(text()).toContain('Start your free 1 month')
  })
})

describe('somebody signed in', () => {
  it('on the free plan reads that it is their current plan', async () => {
    m.user = { id: 'u1', role: 'ADMIN', organization: { subscriptionPlan: null } }
    m.status = FREE
    renderIt()
    await waitFor(() => expect(text()).toContain('Your current plan'))
  })

  it('inside a free run, or paying, is not told they are on the free plan', async () => {
    m.user = { id: 'u1', role: 'ADMIN', organization: { subscriptionPlan: null } }
    m.status = { ...FREE, onTheHouse: { plan: 'SMALL_TEAM', until: '2026-12-27T00:00:00.000Z' } }
    renderIt()
    await waitFor(() => expect(text()).toContain('Included with every plan'))
    expect(text()).not.toContain('Your current plan')
  })

  it('a guest, served nothing about billing, is not told either', async () => {
    m.user = { id: 'u4', role: 'GUEST', organization: { subscriptionPlan: null } }
    m.status = {}
    renderIt()
    await waitFor(() => expect(text()).toContain('$410 a month'))
    expect(text()).not.toContain('Your current plan')
  })
})
