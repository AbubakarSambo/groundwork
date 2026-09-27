import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BillingPage } from './BillingPage'

/**
 * PLAN AND BILLING, AS EACH PERSON READS IT (F2, U.19).
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
const TRIAL_OFF = { on: false, teamsUnder: 20, months: 3 }
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
  m.pricing = { plans: PLANS, free: { groundLimit: 10, memberLimit: 5 }, trial: TRIAL_OFF }
})

describe('Grace, an admin, on Growth', () => {
  beforeEach(() => {
    m.status = {
      subscription: { plan: 'GROWTH', status: 'active', periodEnd: '2026-10-01T09:00:00.000Z', endsAt: null, freeExtensionUsed: false },
      people: { count: 27, cap: 100 },
      onTheHouse: null,
      usage: { checkIns: 38, reportsReleased: 12, peopleTakingPart: 25 },
      activeGrounds: [],
      card: { brand: 'visa', last4: '4417' },
      invoices: [{ paidOn: '2026-09-01T09:00:00.000Z', amountCents: 40000, currency: 'USD' }],
    }
  })

  it('reads the prototype’s page, with her own numbers', async () => {
    renderIt()
    await waitFor(() => expect(text()).toContain('Growth, $400 a month. 27 of 100 people.'))
    expect(screen.getByRole('heading', { name: 'Plan and billing' })).toBeTruthy()
    expect(text()).toContain('Baridi Appliances')
    expect(text()).toContain('1 October, $400, by card ending 4417.')
    expect(text()).toContain('Every person with a Groundwork account at Baridi Appliances. Guests from outside don’t.')
    expect(text()).toContain('38 check-ins, 12 reports shared, and 25 people taking part.')
    expect(text()).toContain('One flat monthly rate, unlimited check-ins, sessions and reports')
    expect(text()).toContain('Custom needs, volume pricing or dedicated support.')
    expect(text()).toContain('Pause, or cancel at the end of this period. Either way, everything stays readable.')
    expect(screen.getByText('Change card')).toBeTruthy()
  })

  it('every plan comes from the table, hers says "Your plan", and the others "Move to this"', async () => {
    renderIt()
    await waitFor(() => expect(text()).toContain('$1,650/mo'))
    expect(screen.getAllByText('Move to this')).toHaveLength(4)
    expect(screen.getByText('Your plan', { selector: 'span' })).toBeTruthy()
    expect(text()).toContain('Up to 500 people')
  })

  it('lists what she has paid', async () => {
    renderIt()
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Invoices' })).toBeTruthy())
    expect(text()).toContain('1 September')
    expect(text()).toContain('$400, paid.')
  })

  it('says nothing about a free trial while it is off', async () => {
    renderIt()
    await waitFor(() => expect(text()).toContain('Growth, $400 a month.'))
    expect(text()).not.toMatch(/free trial|months free/i)
  })
})

describe('Grace, on the free plan', () => {
  beforeEach(() => {
    m.status = { subscription: { plan: null, status: null, periodEnd: null, endsAt: null, freeExtensionUsed: false }, people: { count: 3, cap: 5 }, onTheHouse: null, activeGrounds: [], card: null, invoices: [] }
  })

  it('reads that the five include her, and that nothing is charged until she chooses', async () => {
    renderIt()
    await waitFor(() => expect(text()).toContain('The free plan, for up to 10 check-ins. 3 of 5 people, including you.'))
    expect(text()).toContain('Nothing is charged until you choose a plan.')
    expect(screen.getAllByText('Move to this')).toHaveLength(5)
    expect(screen.queryByText('Stopping')).toBeNull()
    expect(screen.queryByText('Change card')).toBeNull()
  })

  it('reads the one shared trial sentence once the trial is switched on', async () => {
    m.pricing = { ...m.pricing, trial: TRIAL_ON }
    renderIt()
    await waitFor(() => expect(text()).toContain('Teams of fewer than 20 people get 3 months free. No card needed.'))
  })
})

describe('a new organisation once the switch is on, with no plan yet (U.19)', () => {
  it('reads that it has no plan, and nothing about a free plan', async () => {
    m.pricing = { ...m.pricing, trial: TRIAL_ON }
    m.status = { subscription: { plan: null, status: null, periodEnd: null, endsAt: null, freeExtensionUsed: false }, people: { count: 1, cap: 1 }, onTheFreePlan: false, onTheHouse: null, activeGrounds: [], card: null, invoices: [] }
    renderIt()
    await waitFor(() => expect(text()).toContain('No plan yet. Choose one below to open check-ins and add people.'))
    expect(text()).toContain('Nothing is charged until you choose a plan.')
    expect(text()).not.toMatch(/free plan|check-ins are free/i)
    expect(screen.getAllByText('Move to this')).toHaveLength(5)
  })

  it('an organisation already on the free plan still reads it, after the switch', async () => {
    m.pricing = { ...m.pricing, trial: TRIAL_ON }
    m.status = { subscription: { plan: null, status: null, periodEnd: null, endsAt: null, freeExtensionUsed: false }, people: { count: 3, cap: 5 }, onTheFreePlan: true, onTheHouse: null, activeGrounds: [], card: null, invoices: [] }
    renderIt()
    await waitFor(() => expect(text()).toContain('The free plan, for up to 10 check-ins. 3 of 5 people, including you.'))
  })
})

describe('Grace, inside the free trial’s months', () => {
  const inDays = (d: number) => new Date(Date.now() + d * 24 * 3600 * 1000).toISOString()

  it('reads the plan it covers and the day it ends, with nothing charged', async () => {
    m.pricing = { ...m.pricing, trial: TRIAL_ON }
    m.status = { subscription: { plan: null, status: null, periodEnd: null, endsAt: null, freeExtensionUsed: false }, people: { count: 12, cap: 20 }, onTheHouse: { plan: 'SMALL_TEAM', until: inDays(40), freeTrial: true }, activeGrounds: [], card: null, invoices: [] }
    renderIt()
    await waitFor(() => expect(text()).toMatch(/Small Team, free until \d+ \w+ \d{4}\. 12 of 20 people\./))
    expect(text()).toContain('Nothing is charged until you choose a plan.')
    expect(text()).not.toContain('Your free 3 months end on')
  })

  it('seven days before the end, reads what keeps it running', async () => {
    m.pricing = { ...m.pricing, trial: TRIAL_ON }
    m.status = { subscription: { plan: null, status: null, periodEnd: null, endsAt: null, freeExtensionUsed: false }, people: { count: 12, cap: 20 }, onTheHouse: { plan: 'SMALL_TEAM', until: inDays(5), freeTrial: true }, activeGrounds: [], card: null, invoices: [] }
    renderIt()
    await waitFor(() => expect(text()).toMatch(/Your free 3 months end on \d+ \w+/))
    expect(text()).toContain('Your team has 12 people, so Small Team, $90 a month, keeps everything running. Nothing is charged until you choose.')
    expect(screen.getByText('Choose Small Team')).toBeTruthy()
    expect(screen.getByText('See every plan')).toBeTruthy()
  })

  it('past the trial’s size, reads that the trial carries on and what comes after', async () => {
    m.pricing = { ...m.pricing, trial: TRIAL_ON }
    m.status = { subscription: { plan: null, status: null, periodEnd: null, endsAt: null, freeExtensionUsed: false }, people: { count: 20, cap: 20 }, onTheHouse: { plan: 'SMALL_TEAM', until: inDays(40), freeTrial: true }, activeGrounds: [], card: null, invoices: [] }
    renderIt()
    await waitFor(() => expect(text()).toContain('You now have 20 people'))
    expect(text()).toContain('The free 3 months are for teams of fewer than 20. Your trial carries on until its end date; after that you’ll need Small Team, $90 a month.')
  })

  it('reads nothing about the trial if the setting is switched off again', async () => {
    m.pricing = { ...m.pricing, trial: TRIAL_OFF }
    m.status = { subscription: { plan: null, status: null, periodEnd: null, endsAt: null, freeExtensionUsed: false }, people: { count: 12, cap: 20 }, onTheHouse: { plan: 'SMALL_TEAM', until: inDays(5), freeTrial: true }, activeGrounds: [], card: null, invoices: [] }
    renderIt()
    await waitFor(() => expect(text()).toMatch(/Small Team, free until/))
    expect(text()).not.toMatch(/free 3 months|Teams of fewer than/)
  })
})

describe('everybody but an admin', () => {
  for (const [who, role] of [['Wairimu, a lead', 'LEAD'], ['Miriam, who takes part', 'MEMBER'], ['Tomas, a guest', 'GUEST']]) {
    it(`${who} reads only that billing is for an admin, and nothing is fetched`, async () => {
      m.role = role
      const { billingApi } = await import('@/api/billing')
      ;(billingApi.status as any).mockClear()
      renderIt()
      await waitFor(() => expect(text()).toContain('You need admin access to manage billing for your organisation.'))
      expect(text()).not.toMatch(/\$|Move to this|Your plan/)
      expect(billingApi.status).not.toHaveBeenCalled()
    })
  }
})
