import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor, screen } from '@testing-library/react'
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
    expect(text()).toContain('Start free with 10 check-ins, for teams of 5 or fewer, including you. Subscribe as your team grows. Unlimited check-ins and reports on every plan.')
    expect(text()).toContain('For small teams getting what each person says written down.')
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
    await waitFor(() => expect(text()).toContain('Teams of fewer than 20 people get 1 month free, WhatsApp included, no card required. Subscribe as your team grows.'))
    expect(text()).toContain('1 month free')
    expect(text()).toContain('$0 for 1 month')
    /* Changed 15 October (fix list item 6): the light prototype's own button, "Start your free month". */
    expect(text()).toContain('Start your free month')
    expect(text()).toContain('Everything on every plan, WhatsApp included, free for your first month. No card required.')
  })

  it('reads the seats each plan includes, +$5 an extra seat and WhatsApp at $4 a person, in the light prototype\'s words (fix list item 6)', async () => {
    m.pricing = {
      ...m.pricing,
      trial: { on: true, teamsUnder: 20, months: 1 },
      plans: m.pricing.plans.map((p: any) => (p.amountCents == null ? p : { ...p, extraSeatCents: 500, whatsappPersonCents: 400 })),
    }
    renderIt()
    await waitFor(() => expect(text()).toContain('20 seats included'))
    expect(text()).toContain('+$5 per extra seat')
    expect(text()).toContain('WhatsApp: +$4 a month per person who uses it')
    expect(text()).toContain('Every person on your team counts as a seat. Each plan includes a number of seats; add more any time for +$5 a seat a month. Unlimited check-ins and reports.')
    expect(text()).toContain('Your team can check in on WhatsApp instead of the app. You pay only for people who use it: $4 a person a month, on any plan, never more than your seats. It is included in your free month.')
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

  it('has a way back into the product, not only "Subscribe"', async () => {
    m.user = { id: 'u1', role: 'ADMIN', organization: { subscriptionPlan: null } }
    m.status = FREE
    renderIt()
    await waitFor(() => expect(text()).toContain('Your current plan'))
    expect(screen.getByRole('link', { name: 'Go to your check-ins' })).toHaveAttribute('href', '/today')
    expect(screen.queryByRole('link', { name: 'Sign in' })).toBeNull()
  })
})

/*
 * B-162. A signed-out visitor had no logo, no sign in and no sign up - only five "Subscribe"
 * buttons, each of which demands an account anyway. Every other public page carries the logo
 * (it always goes home); this one had neither it nor a way in besides the browser's own back
 * button.
 */
describe('B-162: a signed-out visitor has a way in, not only "Subscribe"', () => {
  it('offers the logo, Sign in and Sign up', async () => {
    renderIt()
    await waitFor(() => expect(text()).toContain('$410 a month'))
    expect(screen.getByRole('link', { name: 'Groundwork' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/auth')
    expect(screen.getByRole('link', { name: 'Sign up' })).toHaveAttribute('href', '/auth?mode=signup')
  })
})

/*
 * Run 9: the app told an admin "Your free month has started" while this page said "Start free with 10 check-ins" and "Free, Always". The page says the free month
 * wherever the app does: for an organisation on one, and where the anchor's own free month is on.
 */
describe('the free month is said here as the app says it', () => {
  it('to an admin whose organisation is on a free month, even with the setting for new organisations off', async () => {
    m.user = { id: 'u1', role: 'ADMIN', organization: { subscriptionPlan: null } }
    m.status = { subscription: { plan: null, status: null }, people: { count: 3, cap: 20 }, onTheHouse: { plan: 'SMALL_TEAM', until: '2026-12-20T00:00:00Z', freeTrial: true } }
    renderIt()
    await waitFor(() => expect(text()).toContain('1 month free'))
    expect(text()).toContain('free for your first month')
    expect(text()).not.toContain('Start free with 10 check-ins')
    expect(text()).not.toContain('Always')
  })
  it('to anybody, where the anchor\'s free month is on', async () => {
    m.pricing = { ...m.pricing, anchorTrial: { on: true, months: 1, people: 20 } }
    renderIt()
    await waitFor(() => expect(text()).toContain('1 month free'))
    expect(text()).not.toContain('Start free with 10 check-ins')
    expect(text()).not.toContain('Always')
  })
})

/*
 * RUN 10: until the server has said what is free, or when it cannot say, the page makes no free offer. It had said "Start free with 10 check-ins, for
 * teams of 5 or fewer" and "Free, Always" from numbers it shipped with, while the app said the free month ends on 19 December.
 */
describe('a pricing page that has not heard from the server', () => {
  it('makes no free offer while the request is on its way, or after it fails', async () => {
    m.pricing = new Promise(() => {})
    renderIt()
    await new Promise((r) => setTimeout(r, 50))
    expect(text()).not.toMatch(/Start free with|Always|forever|for teams of 5 or fewer/)
  })
})
