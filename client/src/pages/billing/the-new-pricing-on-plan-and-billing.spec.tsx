import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BillingPage } from './BillingPage'

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

/**
 * THE NEW PRICING ON PLAN AND BILLING (fix list item 6; the light prototype's s73), as Grace, Baridi's admin, reads it.
 *
 * Baridi Appliances. Grace is an admin; Wairimu a lead; Miriam takes part; Tomas is a guest. The
 * words are the prototype's (docs/prototype/screens/F2-billing/settings-billing.txt and upgrade.txt),
 * and every number comes from the server: the plans and prices from the pricing table, the people
 * from the seat count, the free limits and the trial from the platform settings.
 */
const m = vi.hoisted(() => ({
  role: 'ADMIN',
  status: {} as any,
  pricing: {} as any,
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: (sel: any) => sel({ user: { id: 'u1', role: m.role, organizationId: 'o1', organization: { name: 'Baridi Appliances' } } }),
}))
vi.mock('@/api/grounds', () => ({ groundsApi: { list: vi.fn().mockResolvedValue([]) } }))
vi.mock('@/api/client', () => ({ apiClient: { get: vi.fn().mockResolvedValue({ data: { open: {} } }), post: vi.fn() } }))
vi.mock('@/api/billing', async () => {
  const actual = await vi.importActual<typeof import('@/api/billing')>('@/api/billing')
  return {
    ...actual,
    billingApi: {
      status: vi.fn().mockImplementation(async () => m.status),
      getPricing: vi.fn().mockImplementation(async () => m.pricing),
      getContributorCodes: vi.fn().mockResolvedValue([]),
      /* WhatsApp billing (decision 78) is covered on its own, in the-whatsapp-add-on-as-each-reader-sees-it.spec.tsx;
         the minimal shape here just keeps this page's own query from erroring in every test above. */
      getWhatsApp: vi.fn().mockResolvedValue({ on: false, sending: true, says: null }),
      setWhatsApp: vi.fn(),
      createSubscription: vi.fn(), changeSubscriptionPlan: vi.fn().mockResolvedValue({ plan: 'STARTER', periodEnd: null }), portal: vi.fn(),
      cancelSubscription: vi.fn(), keepSubscription: vi.fn(), pauseSubscription: vi.fn(), resumeSubscription: vi.fn(),
    },
  }
})

const PLANS = [
  { plan: 'STARTER', amountCents: 2500, memberCap: 5 },
  { plan: 'SMALL_TEAM', amountCents: 9000, memberCap: 20 },
  { plan: 'GROWTH', amountCents: 40000, memberCap: 100 },
  { plan: 'BUSINESS', amountCents: 90000, memberCap: 250 },
  { plan: 'SCALE', amountCents: 165000, memberCap: 500 },
  { plan: 'ENTERPRISE', amountCents: null, memberCap: null },
].map((p) => ({ ...p, label: p.plan, hasStripePrice: true, updatedAt: '', extraSeatCents: p.amountCents == null ? null : 500, whatsappPersonCents: p.amountCents == null ? null : 400 }))

/* What the server says for Baridi on Small Team with 27 people, 9 of them on WhatsApp (api: extra-seats-and-whatsapp-per-person.spec.ts). */
const MONTH = {
  people: 27,
  plan: 'SMALL_TEAM',
  included: 'Small Team, 20 seats included, plus 7 extra at +$5 each',
  peopleSays: 'Everyone with a Groundwork account at Baridi Appliances. Your plan includes a set number of seats; each extra seat is +$5 a month. You see the price before an invitation goes.',
  lines: [
    { says: 'Small Team', amount: '$90' },
    { says: '7 extra seats × $5', amount: '$35' },
    { says: 'WhatsApp: 9 people used it × $4', amount: '$36' },
  ],
  total: { says: 'This month', amount: '$161' },
  free: null,
  priceChanges: 'Your price only changes when you add people, switch WhatsApp on, or move plan.',
  cheaper: null,
  plansNote: 'Any plan: +$5 per extra seat',
  whatsappRate: '$4 per person who uses it, per month, on any plan',
  plans: [
    ['STARTER', 'Starter', '$25/mo', '5 people', '$135'],
    ['SMALL_TEAM', 'Small Team', '$90/mo', '20 people', '$125'],
    ['GROWTH', 'Growth', '$400/mo', '100 people', '$400'],
    ['BUSINESS', 'Business', '$900/mo', '250 people', '$900'],
    ['SCALE', 'Scale', '$1,650/mo', '500 people', '$1,650'],
  ].map(([plan, name, price, includes, forYou]) => ({ plan, name, price, includes, extraSeats: '+$5 each', whatsapp: '+$4 a person', forYou, yours: plan === 'SMALL_TEAM' })),
  forHowMany: 'For 27',
  numbers: { whatsappOn: true, whatsappUsedIt: 9, whatsappFree: false, whatsappFlatCents: null },
}

function renderIt() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/billing']}><BillingPage /></MemoryRouter>
    </QueryClientProvider>,
  )
}
const text = () => document.body.textContent ?? ''

beforeEach(() => {
  m.role = 'ADMIN'
  m.pricing = { plans: PLANS, free: { groundLimit: 10, memberLimit: 5 }, trial: { on: true, teamsUnder: 20, months: 1 } }
  m.status = {
    subscription: { plan: 'SMALL_TEAM', status: 'active', periodEnd: '2026-11-01T09:00:00.000Z', endsAt: null, freeExtensionUsed: false },
    people: { count: 27, cap: 20 },
    onTheHouse: null,
    activeGrounds: [],
    card: { brand: 'visa', last4: '4417' },
    invoices: [],
    startedWith: { said: 'more', line: 20, says: 'Baridi Appliances started with 27, so it began on a plan.' },
    month: MONTH,
  }
})

describe('Grace, on Small Team with 27 people', () => {
  it('reads her plan, the people, this month line by line and the next payment, in the prototype\'s words', async () => {
    renderIt()
    await waitFor(() => expect(text()).toContain('Small Team, 20 seats included, plus 7 extra at +$5 each'))
    expect(text()).toContain('Everyone with a Groundwork account at Baridi Appliances. Your plan includes a set number of seats; each extra seat is +$5 a month. You see the price before an invitation goes.')
    for (const [a, b] of [['Small Team', '$90'], ['7 extra seats × $5', '$35'], ['WhatsApp: 9 people used it × $4', '$36'], ['This month', '$161']]) {
      expect(text()).toContain(a)
      expect(text()).toContain(b)
    }
    expect(text()).toContain('Next payment 1 November, by card ending 4417. Your price only changes when you add people, switch WhatsApp on, or move plan.')
    expect(text()).toContain('Any plan: +$5 per extra seat')
    expect(text()).toContain('For 27')
    expect(text()).toContain('Teams of fewer than 20 people get 1 month free, WhatsApp included, with no card. Existing organisations that never had one get it from the day it starts, WhatsApp included. Baridi Appliances started with 27, so it began on a plan.')
    expect(screen.getByRole('heading', { name: 'Free month' })).toBeTruthy()
    expect(screen.getAllByText('Move to this')).toHaveLength(4)
    expect(text()).not.toMatch(/3 months|undefined|NaN/)
  })

  it('the counter shows what more people would cost, and changes nothing', async () => {
    renderIt()
    await waitFor(() => expect(text()).toContain('For 27'))
    fireEvent.click(screen.getByRole('button', { name: 'One more' }))
    await waitFor(() => expect(text()).toContain('For 28'))
    expect(text()).toContain('Small Team, 20 seats included, plus 8 extra at +$5 each')
    expect(text()).toContain('8 extra seats × $5')
    expect(text()).toContain('$166')
    fireEvent.click(screen.getByRole('button', { name: 'One fewer' }))
    await waitFor(() => expect(text()).toContain('For 27'))
  })

  it('a cheaper plan is suggested with a button, and only her press moves her', async () => {
    const { billingApi } = await import('@/api/billing')
    m.status = { ...m.status, subscription: { ...m.status.subscription, plan: 'GROWTH' }, people: { count: 12, cap: 100 },
      month: { ...MONTH, people: 12, plan: 'GROWTH', included: 'Growth, 100 seats included', lines: [{ says: 'Growth', amount: '$400' }, { says: 'WhatsApp: switched off', amount: '$0' }], total: { says: 'This month', amount: '$400' },
        cheaper: { plan: 'STARTER', says: 'Cheaper for 12 people: Starter with 7 extra seats, $60 a month instead of $400.', button: 'Switch to Starter' } } }
    renderIt()
    await waitFor(() => expect(text()).toContain('Cheaper for 12 people: Starter with 7 extra seats, $60 a month instead of $400.'))
    expect(billingApi.changeSubscriptionPlan).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Switch to Starter' }))
    await waitFor(() => expect(billingApi.changeSubscriptionPlan).toHaveBeenCalledWith('STARTER'))
  })

  it('a lead never opens the page', async () => {
    m.role = 'LEAD'
    renderIt()
    await waitFor(() => expect(text()).not.toContain('This month'))
    expect(text()).not.toContain('$161')
  })
})
