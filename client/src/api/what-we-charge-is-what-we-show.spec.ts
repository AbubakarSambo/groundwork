import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  FALLBACK_PLAN_PRICES_CENTS,
  FREE_GROUND_LIMIT,
  PLAN_PRICES,
  formatPlanPrice,
  type SubscriptionPlan,
} from './billing'

/**
 * THE GAP BETWEEN WHAT WE CHARGE AND WHAT WE SAY WE CHARGE.
 *
 * Two guards already compared pricing copy across the app and the marketing site. Both compared
 * DISPLAY to DISPLAY. Nothing compared either of them to the cents the API actually hands Stripe -
 * so `PLAN_PRICES_CENTS` could be changed to 3500 and every pricing test in the repo would still
 * pass while all three surfaces advertised $25. Charging somebody a price you never showed them is
 * the worst failure available in this part of the product, and it was one careless edit away.
 *
 * This is the guard that was missing. It reads the API's own defaults as text - not as an import,
 * because the client does not build against the API - and pins them to the client's fallbacks.
 *
 * WHY DEFAULTS AND NOT LIVE VALUES. Prices are now editable by a platform admin, so the live figure
 * is a database row and no test can pin it. What a test CAN pin is that the two codebases agree on
 * where they start from, which is the only place a silent divergence could be committed. A price
 * changed deliberately in the admin panel reaches both sides through the same endpoint, so it
 * cannot diverge at all.
 */
const API_PRICING = readFileSync(
  join(__dirname, '../../../api/src/modules/billing/pricing.service.ts'),
  'utf8',
)

/** Parses `[SubscriptionPlan.STARTER]: 2500,` out of a named record in the API source. */
function apiRecord(name: string): Record<string, number> {
  const start = API_PRICING.indexOf(`${name}:`)
  expect(start, `${name} should exist in the API's pricing service`).toBeGreaterThan(-1)
  const block = API_PRICING.slice(start, API_PRICING.indexOf('};', start))
  const out: Record<string, number> = {}
  for (const m of block.matchAll(/\[SubscriptionPlan\.(\w+)\]:\s*(\d+)/g)) out[m[1]] = Number(m[2])
  return out
}

describe('the cents the API charges are the cents the client shows', () => {
  const apiCents = apiRecord('DEFAULT_PLAN_PRICES_CENTS')

  it('the API defines a default price for every plan the client prices', () => {
    const clientPriced = Object.entries(FALLBACK_PLAN_PRICES_CENTS)
      .filter(([, v]) => v !== null)
      .map(([k]) => k)
      .sort()
    expect(Object.keys(apiCents).sort()).toEqual(clientPriced)
  })

  it.each(Object.keys(apiCents))('%s costs the same on both sides', (plan) => {
    expect(FALLBACK_PLAN_PRICES_CENTS[plan as SubscriptionPlan]).toBe(apiCents[plan])
  })

  it('and the client prices no plan the API refuses to charge for', () => {
    /**
     * ENTERPRISE is the case this protects: it must stay null on the client, because the API throws
     * on any attempt to check out with it. A number here would render a Subscribe button that
     * cannot work.
     */
    expect(FALLBACK_PLAN_PRICES_CENTS.ENTERPRISE).toBeNull()
    expect(API_PRICING).toMatch(/PURCHASABLE_PLANS/)
    expect(API_PRICING.slice(API_PRICING.indexOf('PURCHASABLE_PLANS'), API_PRICING.indexOf('DEFAULT_PLAN_PRICES_CENTS')))
      .not.toMatch(/ENTERPRISE/)
  })
})

describe('the free ground limit is one number, not two', () => {
  it('the API default and the client fallback match', () => {
    const m = API_PRICING.match(/DEFAULT_FREE_GROUND_LIMIT = (\d+)/)
    expect(m, 'the API should export a default free ground limit').toBeTruthy()
    expect(FREE_GROUND_LIMIT).toBe(Number(m![1]))
  })

  it('and the enforcing service reads it rather than holding its own copy', () => {
    /**
     * `BillingService.FREE_GROUND_LIMIT` used to be a literal 10 sitting beside the client's
     * literal 10. It is now the imported default, and the enforced value is a live read.
     */
    const billing = readFileSync(
      join(__dirname, '../../../api/src/modules/billing/billing.service.ts'),
      'utf8',
    )
    expect(billing).toMatch(/static readonly FREE_GROUND_LIMIT = DEFAULT_FREE_GROUND_LIMIT;/)
    expect(billing).toMatch(/await this\.pricing\.getFreeGroundLimit\(\)/)
  })
})

describe('a price is charged from the same read the admin panel writes', () => {
  const billing = readFileSync(
    join(__dirname, '../../../api/src/modules/billing/billing.service.ts'),
    'utf8',
  )

  it('checkout reads the live price instead of a compiled-in map', () => {
    expect(billing).toMatch(/const amountCents = await this\.pricing\.getPlanPriceCents\(plan\)/)
  })

  it('and the old hardcoded map is gone, not merely unused', () => {
    /** Leaving it in place is how a future edit lands on the dead copy and changes nothing. */
    expect(billing).not.toMatch(/PLAN_PRICES_CENTS: Partial<Record<SubscriptionPlan, number>>/)
  })

  it('a missing price refuses the checkout rather than charging zero', () => {
    /**
     * The important failure mode. `unit_amount: undefined` or 0 would create a real Stripe
     * subscription for nothing at all.
     */
    const fn = billing.slice(billing.indexOf('async createSubscription('))
    expect(fn.slice(0, fn.indexOf('checkout.sessions.create'))).toMatch(/if \(!amountCents\)[\s\S]*?throw new ForbiddenException/)
  })
})

describe('formatting cents never invents a price', () => {
  it('renders whole dollars without cents', () => {
    expect(formatPlanPrice(2500)).toBe('$25/mo')
    expect(formatPlanPrice(40000)).toBe('$400/mo')
  })

  it('keeps the cents when there are any', () => {
    expect(formatPlanPrice(2550)).toBe('$25.50/mo')
  })

  it('says "Contact us" rather than $0 when there is no price', () => {
    /** $0/mo on the Enterprise card would read as a free unlimited plan. */
    expect(formatPlanPrice(null)).toBe('Contact us')
    expect(formatPlanPrice(undefined)).toBe('Contact us')
    expect(PLAN_PRICES.ENTERPRISE).toBe('Contact us')
  })

  it('and the shipped display strings still agree with the shipped cents', () => {
    for (const [plan, cents] of Object.entries(FALLBACK_PLAN_PRICES_CENTS)) {
      expect(PLAN_PRICES[plan as SubscriptionPlan]).toBe(formatPlanPrice(cents))
    }
  })
})
