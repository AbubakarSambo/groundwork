import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BillingPage } from './BillingPage'
import { billingApi } from '@/api/billing'

/**
 * WHATSAPP, THE PAID ADD-ON, ON PLAN AND BILLING (decision 78, 2 October).
 *
 * `GET /billing/whatsapp` decides the shape it serves, not the screen: while `release.planAndBillingNewParts`
 * is off, even an admin reads only `{ sending, says }`, so the section does not show at all. Once it
 * is on, an admin reads the full shape and the screen draws every sentence, price and count exactly
 * as served (`api/src/modules/billing/whatsapp-add-on.service.ts`, "WHAT PLAN AND BILLING SAYS ABOUT
 * WHATSAPP"); nobody else is served the price, the use or the limit.
 */
const m = vi.hoisted(() => ({
  role: 'ADMIN',
  status: {} as any,
  pricing: {} as any,
  whatsapp: {} as any,
  setWhatsApp: vi.fn(),
  /** The platform switch (U.6, GET /auth/whatsapp) - on by default, so the existing tests below
   *  keep reading the organisation's own add-on exactly as before; a dedicated block turns it off. */
  platformOn: true,
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: (sel: any) => sel({ user: { id: 'u1', role: m.role, organizationId: 'o1', organization: { name: 'Baridi Appliances' } } }),
}))
vi.mock('@/api/grounds', () => ({ groundsApi: { list: vi.fn().mockResolvedValue([]) } }))
vi.mock('@/api/client', () => ({
  apiClient: {
    get: vi.fn().mockImplementation(async (url: string) => (
      url === '/auth/whatsapp' ? { data: { on: m.platformOn } } : { data: { open: {} } }
    )),
    post: vi.fn(),
  },
}))

vi.mock('@/api/billing', async () => {
  const actual = await vi.importActual<typeof import('@/api/billing')>('@/api/billing')
  return {
    ...actual,
    billingApi: {
      status: vi.fn().mockImplementation(async () => m.status),
      getPricing: vi.fn().mockImplementation(async () => m.pricing),
      getContributorCodes: vi.fn().mockResolvedValue([]),
      getWhatsApp: vi.fn().mockImplementation(async () => m.whatsapp),
      setWhatsApp: m.setWhatsApp,
      createSubscription: vi.fn(), changeSubscriptionPlan: vi.fn(), portal: vi.fn(),
      cancelSubscription: vi.fn(), keepSubscription: vi.fn(), pauseSubscription: vi.fn(), resumeSubscription: vi.fn(),
    },
  }
})

const PLANS = [{ plan: 'GROWTH', amountCents: 40000, memberCap: 100, label: 'GROWTH', hasStripePrice: true, updatedAt: '' }]

const STATUS = {
  subscription: { plan: 'GROWTH', status: 'active', periodEnd: '2026-10-01T09:00:00.000Z', endsAt: null, freeExtensionUsed: false },
  people: { count: 27, cap: 100 },
  onTheHouse: null,
  usage: { checkIns: 38, reportsReleased: 12, peopleTakingPart: 25 },
  activeGrounds: [],
  card: { brand: 'visa', last4: '4417' },
  invoices: [],
}

/** The admin shape `whatTheyRead` serves once the release switch is on and WhatsApp is on, with the limit not yet reached. */
const WHATSAPP_ON = {
  on: true,
  plan: 'GROWTH',
  price: { amountCents: 72000, currency: 'USD' as const },
  charged: true,
  freeTrial: null,
  onTheFreePlan: false,
  use: { month: '2026-10', sent: 412, limit: 2000, startsAgainOn: '2026-11-01T00:00:00.000Z' },
  sending: true,
  heldBecause: null,
  says: {
    onOrOff: 'WhatsApp is on for your organisation.',
    price: 'WhatsApp costs $720 a month on your Growth plan.',
    charge: 'WhatsApp is added to your monthly bill as a second line.',
    use: 'Your organisation has sent 412 of its 2,000 WhatsApp messages this month.',
    atTheLimit: 'If your organisation sends all 2,000 messages in a month, nothing more is sent by WhatsApp until the next month begins. Check-ins carry on in the app, and you are told once.',
    reachedTheLimit: null,
    held: null,
  },
}

const WHATSAPP_AT_LIMIT = {
  ...WHATSAPP_ON,
  sending: false,
  heldBecause: 'at the limit' as const,
  use: { ...WHATSAPP_ON.use, sent: 2000 },
  says: {
    ...WHATSAPP_ON.says,
    use: 'Your organisation has sent 2,000 of its 2,000 WhatsApp messages this month.',
    reachedTheLimit: 'Your organisation has used all 2,000 of its WhatsApp messages for October. Nothing more is sent by WhatsApp until 1 November 2026. Check-ins carry on in the app, so nobody misses one.',
    held: 'Your organisation has used all its WhatsApp messages for this month, so this check-in stays in the app. WhatsApp starts again on 1 November 2026.',
  },
}

const WHATSAPP_MINIMAL = { on: false, sending: true, says: null }

/**
 * THE ADMIN SHAPE, WITH THE ADD-ON ITSELF OFF (known issue U16, fixed in the screens workspace):
 * the server keeps serving an admin the full shape so they can still read the price and flip the
 * switch back on, but the usage sentences (`use`, `atTheLimit`) are still in that shape whether or
 * not `on` is true - it is the screen's job not to read "Your organisation has sent 412 of its
 * 2,000 WhatsApp messages this month" as an allowance that means anything while the switch is off.
 */
const WHATSAPP_OFF_ADMIN = {
  ...WHATSAPP_ON,
  on: false,
  sending: true,
  heldBecause: 'not turned on' as const,
  says: {
    ...WHATSAPP_ON.says,
    onOrOff: 'WhatsApp is off for your organisation, so check-ins stay in the app.',
    charge: 'If you turn WhatsApp on, it is added to your monthly bill as a second line.',
  },
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
  vi.clearAllMocks()
  m.role = 'ADMIN'
  m.platformOn = true
  m.pricing = { plans: PLANS, free: { groundLimit: 10, memberLimit: 5 }, trial: { on: false, teamsUnder: 20, months: 1 } }
  m.status = STATUS
  m.whatsapp = WHATSAPP_MINIMAL
})

describe('the switch is off (how it ships): nothing about WhatsApp shows, even to an admin', () => {
  it('the section is absent', async () => {
    renderIt()
    await waitFor(() => expect(text()).toContain('Growth, $400 a month.'))
    expect(screen.queryByRole('heading', { name: 'WhatsApp' })).toBeNull()
    expect(text()).not.toMatch(/WhatsApp/)
  })
})

describe('Grace, an admin, once the switch is on', () => {
  beforeEach(() => { m.whatsapp = WHATSAPP_ON })

  it('reads the price, the charge and this month’s use exactly as served', async () => {
    renderIt()
    const section = await screen.findByRole('heading', { name: 'WhatsApp' })
    const region = section.closest('section') ?? section.parentElement!
    expect(region.textContent).toContain('WhatsApp is on for your organisation.')
    expect(region.textContent).toContain('WhatsApp costs $720 a month on your Growth plan.')
    expect(region.textContent).toContain('WhatsApp is added to your monthly bill as a second line.')
    expect(region.textContent).toContain('Your organisation has sent 412 of its 2,000 WhatsApp messages this month.')
    expect(region.textContent).toContain('If your organisation sends all 2,000 messages in a month, nothing more is sent by WhatsApp until the next month begins. Check-ins carry on in the app, and you are told once.')
    expect(region.textContent).not.toContain('Your organisation has used all')
  })

  it('turning the switch sends PATCH /billing/whatsapp with the opposite state', async () => {
    m.setWhatsApp.mockResolvedValue({ ...WHATSAPP_ON, on: false, says: { ...WHATSAPP_ON.says, onOrOff: 'WhatsApp is off for your organisation, so check-ins stay in the app.' } })
    renderIt()
    await screen.findByRole('heading', { name: 'WhatsApp' })
    fireEvent.click(screen.getByRole('switch', { name: 'WhatsApp is on for your organisation.' }))
    await waitFor(() => expect(m.setWhatsApp).toHaveBeenCalledWith(false))
  })

  it('at the limit, "Reached" replaces "At the limit", in the served words', async () => {
    m.whatsapp = WHATSAPP_AT_LIMIT
    renderIt()
    const section = await screen.findByRole('heading', { name: 'WhatsApp' })
    const region = section.closest('section') ?? section.parentElement!
    expect(region.textContent).toContain('Your organisation has used all 2,000 of its WhatsApp messages for October. Nothing more is sent by WhatsApp until 1 November 2026. Check-ins carry on in the app, so nobody misses one.')
    expect(region.textContent).not.toContain('If your organisation sends all 2,000 messages in a month')
  })
})

describe('the add-on itself is off, though the release switch is on (known issue U16)', () => {
  beforeEach(() => { m.whatsapp = WHATSAPP_OFF_ADMIN })

  it('shows the price and the switch, but hides the allowance that means nothing while it is off', async () => {
    renderIt()
    const section = await screen.findByRole('heading', { name: 'WhatsApp' })
    const region = section.closest('section') ?? section.parentElement!
    expect(region.textContent).toContain('WhatsApp is off for your organisation, so check-ins stay in the app.')
    expect(region.textContent).toContain('WhatsApp costs $720 a month on your Growth plan.')
    expect(region.textContent).toContain('If you turn WhatsApp on, it is added to your monthly bill as a second line.')
    expect(region.textContent).not.toMatch(/WhatsApp messages this month/)
    expect(region.textContent).not.toContain('If your organisation sends all 2,000 messages in a month')
  })

  it('turning it on shows the allowance again, exactly as served', async () => {
    m.setWhatsApp.mockResolvedValue(WHATSAPP_ON)
    renderIt()
    await screen.findByRole('heading', { name: 'WhatsApp' })
    fireEvent.click(screen.getByRole('switch', { name: 'WhatsApp is off for your organisation, so check-ins stay in the app.' }))
    await waitFor(() => expect(m.setWhatsApp).toHaveBeenCalledWith(true))
    expect(await screen.findByText('Your organisation has sent 412 of its 2,000 WhatsApp messages this month.')).toBeTruthy()
  })
})

describe('the platform switch is off (U.6, screen fault 2): nothing about WhatsApp shows, even with the add-on itself on', () => {
  beforeEach(() => { m.platformOn = false; m.whatsapp = WHATSAPP_ON })

  it('Kilima, an admin, reads nothing about WhatsApp at all', async () => {
    renderIt()
    await waitFor(() => expect(text()).toContain('Growth, $400 a month.'))
    expect(screen.queryByRole('heading', { name: 'WhatsApp' })).toBeNull()
    expect(text()).not.toMatch(/WhatsApp/)
  })

  it('does not even ask the server for the add-on\'s own state', async () => {
    renderIt()
    await waitFor(() => expect(text()).toContain('Growth, $400 a month.'))
    expect(billingApi.getWhatsApp).not.toHaveBeenCalled()
  })
})

describe('somebody who is not an admin', () => {
  beforeEach(() => { m.role = 'MEMBER' })

  /* B-216 (said why in the commit): the dead-end sentence this used to check for is gone, replaced
     by the shared door's own wording, with a way back. */
  it('reads only that an admin can open this, nothing about WhatsApp', async () => {
    renderIt()
    await waitFor(() => expect(screen.getByText('Only an admin can open Plan and billing.')).toBeTruthy())
    expect(screen.queryByRole('heading', { name: 'WhatsApp' })).toBeNull()
    expect(text()).not.toMatch(/WhatsApp/)
  })
})

describe('no price, limit or number of months is written into the screen', () => {
  const PAGE = readFileSync(join(__dirname, 'BillingPage.tsx'), 'utf8')
  const start = PAGE.indexOf('heading="WhatsApp"')
  const end = PAGE.indexOf('</Section>', start) + '</Section>'.length
  const section = PAGE.slice(PAGE.lastIndexOf('{isWhatsAppBillingAdmin', start), end)

  it('no digit sits beside a currency sign or the word "month": every price and limit comes from `whatsapp.says`', () => {
    expect(section.length).toBeGreaterThan(0)
    expect(section).not.toMatch(/[$£€]\s*\d/)
    expect(section).not.toMatch(/\d+\s*months?\b/i)
  })
})

/*
 * HAFSAH'S DECISION D1, 13 OCTOBER 2026, EVENING: WhatsApp is on for every organisation for a free month, and this part
 * of the page "is meant to be there". The admin reads the free month and how to keep it after.
 */
describe('the free WhatsApp month, as the admin reads it', () => {
  it('says it is on during the free month, until when, and how to keep it', async () => {
    m.whatsapp = {
      ...WHATSAPP_OFF_ADMIN,
      sending: true,
      heldBecause: null,
      freeUntil: '2026-11-13T00:00:00.000Z',
      says: {
        ...WHATSAPP_OFF_ADMIN.says,
        onOrOff: 'WhatsApp is on for your organisation during its free month.',
        freeMonth: 'WhatsApp is free until 13 November 2026. To keep it after that, add it to your subscription with the switch above.',
      },
    }
    renderIt()
    await waitFor(() => expect(text()).toContain('WhatsApp is on for your organisation during its free month.'))
    expect(text()).toContain('Free month')
    expect(text()).toContain('WhatsApp is free until 13 November 2026. To keep it after that, add it to your subscription with the switch above.')
  })
})
