import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BillingPage } from './BillingPage'

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

/**
 * PLAN AND BILLING AFTER THE FREE MONTH, AS EACH PERSON READS IT (Hafsah, 2 November 2026). Copied from the setup of
 * plan-and-billing-as-each-reader-sees-it.spec.tsx.
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
      createSubscription: vi.fn(), changeSubscriptionPlan: vi.fn(), portal: vi.fn(),
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
].map((p) => ({ ...p, label: p.plan, hasStripePrice: true, updatedAt: '' }))
const TRIAL_ON = { on: true, teamsUnder: 20, months: 3 }

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
  m.pricing = { plans: PLANS, free: { groundLimit: 10, memberLimit: 5 }, trial: TRIAL_ON }
})

const IN_THE_WEEKS = 'Your free month has ended. Everything keeps working until 16 November, and then Groundwork pauses until you choose a plan.'
const PAUSED = 'Groundwork is paused at Baridi Appliances until you choose a plan. No check-ins open and no messages go out. Everything is kept, and you can still read it all.'

describe('Grace, an admin, in the four weeks after the free month', () => {
  beforeEach(() => {
    m.status = {
      subscription: { plan: null, status: null, periodEnd: null, endsAt: null, freeExtensionUsed: false },
      people: { count: 12, cap: 20 },
      onTheHouse: { plan: 'SMALL_TEAM', until: '2026-11-15T22:30:00.000Z', freeTrial: false },
      afterTheTrial: IN_THE_WEEKS,
      activeGrounds: [],
    }
  })
  it('reads how long everything keeps working, in the server\'s sentence, and not that she is "on us"', async () => {
    renderIt()
    await waitFor(() => expect(text()).toContain(IN_THE_WEEKS))
    console.log(`GRACE READS: ${IN_THE_WEEKS}`)
    expect(text()).not.toContain('You are on us until')
    expect(text()).not.toContain('After that date the free plan applies')
  })
})

describe('Grace, an admin, once Groundwork has paused', () => {
  beforeEach(() => {
    m.status = {
      subscription: { plan: null, status: null, periodEnd: null, endsAt: null, freeExtensionUsed: false },
      people: { count: 12, cap: 1 },
      onTheHouse: null,
      onTheFreePlan: false,
      afterTheTrial: PAUSED,
      activeGrounds: [],
    }
  })
  it('reads that it is paused, that nothing is lost, and that choosing a plan opens check-ins again', async () => {
    renderIt()
    await waitFor(() => expect(text()).toContain(PAUSED))
    expect(text()).toContain('No plan yet. Choose one below to open check-ins and add people.')
    expect(text()).not.toContain('You are on the free plan')
  })
})

describe('Wairimu, a lead, and Miriam, who takes part, once Groundwork has paused', () => {
  for (const role of ['LEAD', 'MEMBER']) {
    it(`${role}: is served no sentence about paying here, and reads none`, async () => {
      m.role = role
      /* What the server serves a reader who is not an admin (billing.controller theStatusAsTheyMayReadIt): no afterTheTrial. */
      m.status = { subscription: { plan: null, status: null }, people: { count: 12, cap: 1 }, onTheHouse: null }
      renderIt()
      await waitFor(() => expect(text()).toContain('Plan and billing'))
      expect(text()).not.toContain('Groundwork is paused')
      expect(text()).not.toContain('Everything keeps working until')
    })
  }
})
