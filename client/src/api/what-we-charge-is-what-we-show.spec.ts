import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  FALLBACK_PLAN_PRICES_CENTS,
  PLAN_PRICES,
  formatMonthlyPrice,
  type SubscriptionPlan,
} from './billing'
import { SEEDED_PLANS } from './pricing-seed.testonly'

/**
 * THE GAP BETWEEN WHAT WE CHARGE AND WHAT WE SAY WE CHARGE.
 *
 * Two guards already compared pricing copy across the app and the marketing site, and both
 * compared DISPLAY to DISPLAY. Nothing compared either of them to the amount the API hands
 * Stripe - so the charged figure could move and every pricing test in the repo would still pass
 * while all three surfaces advertised the old price. Charging somebody a price you never showed
 * them is the worst failure available here, and it was one careless edit away.
 *
 * Prices now live in the `pricing_plans` table and a platform admin edits them, so no test can
 * pin the LIVE figure - that is a database row, and it reaching both sides through one endpoint
 * is the whole point of the design. What a test can pin is the pair of hardcoded starting points
 * that remain: the seed in the migration, and the client's pre-load fallback. Those are the only
 * two places a divergence can still be committed, and they are what this holds together.
 */
const ADMIN_CONTROLLER = readFileSync(
  join(__dirname, '../../../api/src/modules/admin/admin.controller.ts'),
  'utf8',
)
const PRICING_SERVICE = readFileSync(
  join(__dirname, '../../../api/src/modules/billing/pricing.service.ts'),
  'utf8',
)

/**
 * The seeded amount for every plan that has one, FOLDED across all migrations.
 *
 * This used to parse the first migration's INSERT and nothing else, so it compared the client's
 * fallback to the price the database started at in August rather than the price it holds now. The
 * moment a later migration changed an amount, this failed while both sides were correct - and had
 * the client not been updated it would have passed while both were wrong. Same defect either way:
 * a guard reading one file about a value that several files decide.
 */
function seededCents(): Record<string, number> {
  const out: Record<string, number> = {}
  for (const [plan, row] of Object.entries(SEEDED_PLANS)) {
    if (row.amountCents !== null) out[plan] = row.amountCents
  }
  return out
}

describe('the cents the API seeds are the cents the client falls back to', () => {
  const seeded = seededCents()

  it('the migration seeds a price for every plan the client can price', () => {
    const clientPriced = Object.entries(FALLBACK_PLAN_PRICES_CENTS)
      .filter(([, v]) => v !== null)
      .map(([k]) => k)
      .sort()
    expect(Object.keys(seeded).sort()).toEqual(clientPriced)
  })

  it.each(Object.keys(seededCents()))('%s starts at the same amount on both sides', (plan) => {
    expect(FALLBACK_PLAN_PRICES_CENTS[plan as SubscriptionPlan]).toBe(seeded[plan])
  })

  it('and the client prices no plan the API refuses to sell', () => {
    /**
     * ENTERPRISE is what this protects. It must stay null on the client, because the API refuses
     * it outright - a number here would render a Subscribe button that cannot work.
     */
    expect(FALLBACK_PLAN_PRICES_CENTS.ENTERPRISE).toBeNull()
    expect(seeded.ENTERPRISE).toBeUndefined()
    /** It has a ROW now, for its seat cap, but still no amount. Both facts matter. */
    expect(SEEDED_PLANS.ENTERPRISE?.amountCents ?? null).toBeNull()
    expect(ADMIN_CONTROLLER).toMatch(/Enterprise is contact-sales only/)
  })
})

describe('there is no count of free check-ins (Hafsah, 22 November 2026: "there\'s nothing like 10 free checkins")', () => {
  it('the pricing service has no free check-in limit, and billing counts none', () => {
    expect(PRICING_SERVICE).not.toMatch(/DEFAULT_FREE_GROUND_LIMIT|FREE_GROUND_LIMIT_KEY|getFreeGroundLimit/)
    const billing = readFileSync(join(__dirname, '../../../api/src/modules/billing/billing.service.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
    expect(billing).not.toMatch(/getFreeGroundLimit|groundCount < |FREE_TIER/)
  })

  it('a free check-in seats the same number of people the free PLAN does', () => {
    /**
     * THE MISMATCH THIS EXISTS FOR. `Ground.freeParticipantCap` was 4 while the free plan covered
     * 5 people, so a free user's first check-in refused the fifth person the pricing page had just
     * promised them. Two caps for one number, in different files, each defensible alone.
     *
     * Comments stripped: grounds.service.ts explains this at length and quotes the old 4 while
     * doing it.
     */
    const grounds = readFileSync(
      join(__dirname, '../../../api/src/modules/grounds/grounds.service.ts'),
      'utf8',
    ).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

    /*
     * THE CAP MAY BE WIDENED BY THE SITUATION, AND THE LIMIT IS STILL WHERE IT STARTS FROM.
     *
     * This used to require the literal `freeParticipantCap: DEFAULT_FREE_MEMBER_LIMIT`, which was
     * the whole shape until a cohort check-in - many people in the same role who do not work
     * together - was refused at creation on a free organisation because eight borrowers were
     * counted as staff. The limit now passes through `howManyTheFreePlanCovers`, which returns it
     * unchanged for an ordinary check-in and widens it for the situations where a head count is not
     * a payroll.
     *
     * So the assertion moves from "is the constant" to "derives from the constant", and the half
     * that catches the original defect is untouched: a digit written in this file is still a second
     * copy of a number that lives in the database.
     */
    expect(grounds, 'the per-check-in cap should derive from the free member limit, not its own digit')
      .toMatch(/freeParticipantCap:[^\n]*DEFAULT_FREE_MEMBER_LIMIT/)
    expect(grounds).not.toMatch(/freeParticipantCap: (?:dto\.freeParticipantCap \?\? )?\d+/)
  })

  it('and no page writes the number out by hand', () => {
    /**
     * It was the literal "10" in nine places across three builds, and one of them had already
     * drifted off the constant while the rest of its own page interpolated it.
     */
    for (const page of ['../pages/billing/PricingPage.tsx', '../pages/billing/BillingPage.tsx', '../pages/grounds/CreateGroundPage.tsx']) {
      const src = readFileSync(join(__dirname, page), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
      expect(src, `${page} still hardcodes the free ground count`).not.toMatch(/\b10 [Gg]rounds\b/)
      expect(src, `${page} still promises free check-ins`).not.toMatch(/free check-ins|free plan includes|first \{freeGrounds\}/i)
    }
  })
})

describe('an amount cannot be edited into something Stripe will refuse', () => {
  it('the admin write rejects a non-integer or non-positive amount', () => {
    expect(ADMIN_CONTROLLER).toMatch(/Number\.isInteger\(body\?\.amountCents\)/)
  })

  it('and rejects anything under Stripe\'s 50 cent floor', () => {
    /**
     * The reason this is not just "positive". Stripe refuses a USD charge under 50 cents, so an
     * admin who types 0.25 has not made a cheap plan - they have made a checkout that fails at
     * Stripe with a stack trace instead of failing here with a sentence.
     */
    expect(ADMIN_CONTROLLER).toMatch(/const MIN_PLAN_AMOUNT_CENTS = 50;/)
    /** The comparison, not merely the name - a disabled check still mentions its own constants. */
    expect(ADMIN_CONTROLLER).toMatch(
      /if \(body\.amountCents < MIN_PLAN_AMOUNT_CENTS \|\| body\.amountCents > MAX_PLAN_AMOUNT_CENTS\)/,
    )
  })

  it('an unknown plan name is refused rather than silently ignored', () => {
    expect(ADMIN_CONTROLLER).toMatch(/That plan does not exist/)
  })
})

describe('a price change reaches Stripe rather than only the database', () => {
  it('changing the amount clears the cached Stripe price id', () => {
    /**
     * The single most important line in the pricing service. A Stripe Price is immutable, so a new
     * amount with a stale cached id would charge the OLD price forever while the admin screen and
     * the pricing page both showed the new one.
     */
    expect(PRICING_SERVICE).toMatch(/data: \{ amountCents, stripePriceId: null \}/)
  })

  it('and a missing cached id creates a new Price rather than reusing one', () => {
    expect(PRICING_SERVICE).toMatch(/if \(row\.stripePriceId\) return row\.stripePriceId/)
    expect(PRICING_SERVICE).toMatch(/prices\.create\(/)
  })

  it('the Stripe Product is reused, not recreated per price', () => {
    /** Recreating it per change litters the Stripe dashboard with duplicate products. */
    expect(PRICING_SERVICE).toMatch(/let productId = row\.stripeProductId/)
  })
})

describe('formatting cents never invents a price', () => {
  it('renders whole dollars without cents', () => {
    expect(formatMonthlyPrice(2500)).toBe('$25/mo')
    expect(formatMonthlyPrice(40000)).toBe('$400/mo')
  })

  it('keeps the cents when there are any', () => {
    expect(formatMonthlyPrice(2550)).toBe('$25.50/mo')
  })

  it('and the fallback strings are derived from the fallback cents, not typed again', () => {
    /** Typed by hand they were a fourth copy of every price. */
    for (const [plan, cents] of Object.entries(FALLBACK_PLAN_PRICES_CENTS)) {
      expect(PLAN_PRICES[plan as SubscriptionPlan]).toBe(
        cents === null ? 'Contact us' : formatMonthlyPrice(cents),
      )
    }
  })

  it('says "Contact us" rather than $0 where there is no price', () => {
    /** $0/mo on the Enterprise card reads as a free unlimited plan. */
    expect(PLAN_PRICES.ENTERPRISE).toBe('Contact us')
  })
})
