import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BillingPage } from './BillingPage'
import { toast } from 'sonner'

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

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
    /* F2's own line (U.4 re-review): a guest with an account takes a seat; only guests with no account don't.
       GROUP 1'S THIRD REVIEW: full plain sentences, rewritten as the reviewer gave them. */
    expect(text()).toContain('Everyone with a Groundwork account at Baridi Appliances counts. Guests without an account do not.')
    expect(text()).toContain('So far there have been 38 check-ins and 12 shared reports, with 25 people taking part.')
    expect(text()).toContain('Each plan is one monthly price, with as many check-ins and reports as you need.')
    expect(text()).toContain('For special needs, a lower price per person, or your own support person.')
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

  /**
   * "STARTED WITH" (5 October, evening): `GET /billing/status` serves an admin `startedWith`, one
   * plain sentence about how the organisation began - never shown when the server has not served
   * it, and drawn exactly as it comes.
   */
  it('reads how it began, when the server serves it', async () => {
    m.status = {
      ...m.status,
      startedWith: { said: 'more', line: 20, says: 'When Baridi Appliances was set up, it had 20 or more people, so it began on a plan.' },
    }
    renderIt()
    await waitFor(() => expect(text()).toContain('When Baridi Appliances was set up, it had 20 or more people, so it began on a plan.'))
  })

  it('says nothing about how it began when the server has not served it', async () => {
    renderIt()
    await waitFor(() => expect(text()).toContain('Growth, $400 a month.'))
    expect(text()).not.toMatch(/began on a plan/)
  })
})

describe('Grace, on the free plan', () => {
  beforeEach(() => {
    m.status = { subscription: { plan: null, status: null, periodEnd: null, endsAt: null, freeExtensionUsed: false }, people: { count: 3, cap: 5 }, onTheHouse: null, activeGrounds: [], card: null, invoices: [] }
  })

  it('reads that the five include her, and that nothing is charged until she chooses', async () => {
    renderIt()
    await waitFor(() => expect(text()).toContain('You are on the free plan, which covers up to 10 check-ins and 5 people. 3 of 5 places are used, including yours.'))
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
    await waitFor(() => expect(text()).toContain('You are on the free plan, which covers up to 10 check-ins and 5 people. 3 of 5 places are used, including yours.'))
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

/**
 * GROUP 1 REVIEW: FOUR FAULTS ON THIS PAGE. "Sahar" named with no introduction, a note that read
 * as three sentences joined without punctuation, a code-sharing section that was a dead end for an
 * ordinary admin, and "Free check-in" / "Free extension available" tags repeating on every row of
 * "In progress" instead of one true sentence above the list.
 */
describe('group 1 review fixes', () => {
  beforeEach(() => {
    m.status = { subscription: { plan: null, status: null, periodEnd: null, endsAt: null, freeExtensionUsed: false }, people: { count: 3, cap: 5 }, onTheHouse: null, activeGrounds: [], card: null, invoices: [] }
  })

  it('introduces Sahar by the prototype’s own words for her, before naming her', async () => {
    renderIt()
    await waitFor(() => expect(screen.getByText('A coach in the room')).toBeTruthy())
    expect(screen.getByText(/Sahar Jamal, a partner at Groundwork who coaches teams and helps them set up, reads the report/)).toBeTruthy()
  })

  it('says what "Things our team does by hand" costs, in full sentences', async () => {
    renderIt()
    await waitFor(() => expect(screen.getByText('Things our team does by hand')).toBeTruthy())
    expect(screen.getByText('These are not part of your plan. We tell you what they cost before anyone starts, and invoice you afterwards.')).toBeTruthy()
  })

  it('hides "Share Groundwork with another organisation" from an ordinary admin with no code to see', async () => {
    renderIt()
    await waitFor(() => expect(screen.getByText('Things our team does by hand')).toBeTruthy())
    expect(screen.queryByText('Share Groundwork with another organisation')).toBeNull()
  })

  it('shows it to a platform admin, unchanged', async () => {
    vi.doMock('@/stores/auth', () => ({
      useAuthStore: (sel: any) => sel({ user: { id: 'u1', role: 'ADMIN', isPlatformAdmin: true, organizationId: 'o1', organization: { name: 'Baridi Appliances' } } }),
    }))
    vi.resetModules()
    const { BillingPage: BillingPageForPlatformAdmin } = await import('./BillingPage')
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/billing']}><BillingPageForPlatformAdmin /></MemoryRouter>
      </QueryClientProvider>,
    )
    await waitFor(() => expect(screen.getByText('Share Groundwork with another organisation')).toBeTruthy())
    vi.doUnmock('@/stores/auth')
  })

  it('says once, truthfully, that every row is a free check-in you can extend - no tag on every row', async () => {
    const { groundsApi } = await import('@/api/grounds')
    ;(groundsApi.list as any).mockResolvedValueOnce([
      { id: 'g1', label: 'Faith, first 90 days', isFreeGround: true, org: { freeExtensionUsed: false } },
      { id: 'g2', label: 'Leadership, Q3', isFreeGround: true, org: { freeExtensionUsed: false } },
    ])
    renderIt()
    await waitFor(() => expect(screen.getByText('In progress')).toBeTruthy())
    /* GROUP 1'S THIRD REVIEW: the free extension is claimed from inside a check-in
       (SessionPaywallModal.tsx), never from this page - said truthfully. */
    expect(await screen.findByText('Each of these is a free check-in. You can extend one for free from its own check-in.')).toBeTruthy()
    expect(screen.queryByText('Free check-in')).toBeNull()
    expect(screen.queryByText('Free extension available')).toBeNull()
  })

  /* WALKTHROUGH PASS 2, ITEM 6: EACH NAME IN "IN PROGRESS" LINKS TO ITS OWN CHECK-IN. */
  it('links each check-in\'s own name to its check-in', async () => {
    const { groundsApi } = await import('@/api/grounds')
    ;(groundsApi.list as any).mockResolvedValueOnce([
      { id: 'g1', label: 'Faith, first 90 days', isFreeGround: true, org: { freeExtensionUsed: false } },
    ])
    renderIt()
    const link = await screen.findByRole('link', { name: 'Faith, first 90 days' })
    expect(link).toHaveAttribute('href', '/grounds/g1')
  })
})

/* SCREEN FAULT 4a: "Move to this" used to show a served Stripe refusal word for word,
   "STRIPE_SECRET_KEY is not configured, so nothing can be charged.", naming a configuration key no
   admin asked to read. Any message naming one now becomes the plain sentence a person needs. */
describe('"Move to this" never names a configuration key (screen fault 4a)', () => {
  beforeEach(() => {
    m.status = { subscription: { plan: null, status: null, periodEnd: null, endsAt: null, freeExtensionUsed: false }, people: { count: 3, cap: 5 }, onTheHouse: null, activeGrounds: [], card: null, invoices: [] }
  })

  it('shows "Paying is not set up yet. Nothing was charged." instead of the server\'s own sentence', async () => {
    const { billingApi } = await import('@/api/billing')
    ;(billingApi.createSubscription as any).mockRejectedValueOnce({
      response: { data: { message: 'Billing is not set up on this deployment. STRIPE_SECRET_KEY is not configured, so nothing can be charged. Nothing was attempted and no card was touched.' } },
    })
    renderIt()
    await waitFor(() => expect(screen.getAllByText('Move to this').length).toBeGreaterThan(0))
    fireEvent.click(screen.getAllByText('Move to this')[0])
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Paying is not set up yet. Nothing was charged.'))
    expect(toast.error).not.toHaveBeenCalledWith(expect.stringContaining('STRIPE_SECRET_KEY'))
  })

  it('shows a different server message exactly as sent, when it names no configuration key', async () => {
    const { billingApi } = await import('@/api/billing')
    ;(billingApi.createSubscription as any).mockRejectedValueOnce({ response: { data: { message: 'Your card was declined. Nothing was charged.' } } })
    renderIt()
    await waitFor(() => expect(screen.getAllByText('Move to this').length).toBeGreaterThan(0))
    fireEvent.click(screen.getAllByText('Move to this')[0])
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Your card was declined. Nothing was charged.'))
  })
})

/* SCREEN FAULT 4b: Kijani Foods, a team of 8, used to be offered Starter, "Up to 5 people", with
   no warning that it does not fit them. Both numbers drawn here are served: the plan's own member
   cap (the pricing table) and the organisation's own people count. */
describe('a plan too small for the organisation says so (screen fault 4b)', () => {
  beforeEach(() => {
    m.status = {
      subscription: { plan: null, status: null, periodEnd: null, endsAt: null, freeExtensionUsed: false },
      people: { count: 8, cap: null },
      onTheHouse: null,
      activeGrounds: [],
      card: null,
      invoices: [],
    }
  })

  it('Kijani Foods, 8 people, reads a warning under Starter (cap 5), and nothing under Growth (cap 100)', async () => {
    renderIt()
    await waitFor(() => expect(screen.getAllByText('Move to this').length).toBeGreaterThan(0))
    expect(screen.getByText('This plan is for up to 5 people, and Baridi Appliances has 8.')).toBeTruthy()
    const growthCard = screen.getByText('Growth').closest('.gwui-plan-card')!
    expect(growthCard.textContent).not.toMatch(/is for up to/)
  })

  it('an organisation that fits every plan reads no warning anywhere', async () => {
    m.status = { ...m.status, people: { count: 3, cap: null } }
    renderIt()
    await waitFor(() => expect(screen.getAllByText('Move to this').length).toBeGreaterThan(0))
    expect(screen.queryByText(/is for up to/)).toBeNull()
  })
})

/*
 * SCREEN FAULT 11 (FINAL WALK): "MORE PEOPLE HAVE ACCOUNTS HERE THAN THIS PLAN COVERS." NAMED A
 * PROBLEM WITH NO NEXT STEP BESIDE IT - the row's own action was the same plain "Change" every
 * other plan row carries. Named for what it does here instead: it scrolls to the plans, exactly as
 * "Change" always did, but now says so.
 */
describe('the current plan’s own seat count is over its cap (screen fault 11)', () => {
  beforeEach(() => {
    m.status = {
      subscription: { plan: 'STARTER', status: 'active', periodEnd: '2026-10-01T09:00:00.000Z', endsAt: null, freeExtensionUsed: false },
      people: { count: 8, cap: 5 },
      onTheHouse: null,
      usage: { checkIns: 3, reportsReleased: 0, peopleTakingPart: 8 },
      activeGrounds: [],
      card: { brand: 'visa', last4: '4417' },
      invoices: [],
    }
  })

  it('names the next step beside the warning, not the plain "Change" every other row has', async () => {
    renderIt()
    await waitFor(() => expect(text()).toContain('More people have accounts here than this plan covers.'))
    expect(screen.getByRole('button', { name: "Choose a plan for your team's size" })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Change' })).toBeNull()
  })

  it('still scrolls to the plans, exactly as "Change" always did', async () => {
    renderIt()
    const button = await screen.findByRole('button', { name: "Choose a plan for your team's size" })
    const scrollIntoView = vi.fn()
    const plansSection = document.getElementById('billing-plans')
    if (plansSection) plansSection.scrollIntoView = scrollIntoView
    fireEvent.click(button)
    expect(scrollIntoView).toHaveBeenCalled()
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
