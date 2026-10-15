import { readFileSync } from 'fs'
import { COACH_CARD } from '../lib/scenario-catalog'
import { join } from 'path'
import { describe, it, expect } from 'vitest'
import { type SubscriptionPlan } from './billing'
import { SEEDED_PLANS, seededAmountLabel, seededSeatsIncludedLabel } from './pricing-seed.testonly'

/**
 * THE PUBLIC PRICE AND THE PRICE IN THE APP MUST BE THE SAME PRICE.
 *
 * Inside the app this is already one list: `/pricing` and `/billing` both read
 * `PLAN_PRICES`, `PLAN_MEMBER_CAPS` and `PLAN_FEATURES` from `api/billing.ts`,
 * which is W8-49's "the same tier component rendered publicly, so the two can
 * never disagree".
 *
 * The marketing site is the copy nobody counted. `marketing/src/pages/pricing.astro`
 * writes the same five prices and five seat caps into hand-written HTML, in a
 * separate build. Change a price in the app and myground.work quietly keeps
 * advertising the old one - to the people who have not signed up yet, which is
 * the worst audience to be wrong in front of.
 *
 * Reading the file rather than importing from it on purpose: Astro and the React
 * app build separately, and coupling them to make one number agree would be a
 * bigger change than the problem. This just makes the drift loud.
 *
 * UPDATED when the caps moved into `pricing_plans`. This used to compare the marketing HTML to
 * `PLAN_PRICES` and `PLAN_MEMBER_CAPS`, two hardcoded maps on the client - so it proved the
 * marketing page agreed with the client's copy of the numbers, and neither had to agree with what
 * the database would actually hold. It now reads the migrations, which is the seed the API starts
 * from, so the comparison is marketing copy against the charged and enforced values.
 */
const MARKETING = readFileSync(
  join(__dirname, '../../../marketing/src/pages/pricing.astro'),
  'utf8',
)

/** The five paid tiers with a public price. Enterprise says "contact us" on both. */
const PUBLIC_PLANS: SubscriptionPlan[] = ['STARTER', 'SMALL_TEAM', 'GROWTH', 'BUSINESS', 'SCALE']

describe('the marketing site quotes the app price', () => {
  for (const plan of PUBLIC_PLANS) {
    it(`${plan} costs the same in both places`, () => {
      // "$25/mo" in the app is rendered as "$25" + a separate "/mo" span in the
      // Astro markup, so the amount is what has to match.
      const amount = seededAmountLabel(plan)
      expect(amount, `${plan} has no seeded amount`).not.toBeNull()
      expect(
        MARKETING.includes(`>${amount}<`),
        `the database seeds ${plan} at ${amount} and the marketing page does not quote that`,
      ).toBe(true)
    })

    it(`${plan} seats the same number of people in both places`, () => {
      /**
       * The caps are the half of pricing that had already drifted - Scale said 1,000 people in
       * three places - so they are held to the seed exactly as the prices are.
       */
      /* Changed 15 October (fix list item 6): the pages say "20 seats included" now that any plan can add seats. */
      const cap = seededSeatsIncludedLabel(plan)
      expect(
        MARKETING.includes(cap),
        `the database seeds ${plan} at "${cap}" and the marketing page does not say that anywhere`,
      ).toBe(true)
    })
  }

  /**
   * COACHING IS SOLD, BUT IT IS NOT A PLAN. The Guided option is a human service bought alongside a
   * subscription and invoiced by hand: nothing in `pricing_plans` charges it, Stripe never sees it,
   * and the seat cap does not apply. So it has to be allowed through the check below, which only
   * knows about seeded plans.
   *
   * READ FROM THE PRODUCT RATHER THAN RETYPED HERE, WHICH IS THE FIX FOR WHAT THIS COMMENT USED TO
   * ADMIT. It said: "if the retainer changes, it changes in two places: the pricing page and this
   * line." It then did - the deck moved the retainer to $7,500 and the hour to $700, the page was
   * updated, and this line still said $5,000. The check went red, which is the good outcome, and
   * only because somebody happened to be running the suite.
   *
   * Now the numbers come from `COACH_CARD.cost`, the string the product itself shows a lead when it
   * offers coaching. One copy, and `one-price-said-in-two-places.spec.ts` is what holds the
   * marketing page to it.
   */
  const COACHING_PRICES = [...COACH_CARD.cost.matchAll(/\$\d[\d,]*/g)].map((m) => m[0])

  /**
   * AND THE SERVICES THE SITE SELLS THAT ARE NOT PLANS EITHER.
   *
   * Integration support is priced from, not at, and invoiced by hand like coaching. Read from
   * `marketing/src/site.mjs` - the module the page renders - rather than retyped, because retyping
   * it here is precisely the second copy this file spent its previous comment apologising for.
   */
  const SERVICE_PRICES = [...readFileSync(
    join(__dirname, '..', '..', '..', 'marketing', 'src', 'site.mjs'), 'utf8',
  ).matchAll(/'(\$[0-9][0-9,]*)'/g)].map((m) => m[1])

  it('and does not quote a price the app has never heard of', () => {
    // Plus $0, the free tier, which has no SubscriptionPlan because nobody
    // subscribes to it - it is what an organisation has before it pays.
    const known = new Set(['$0', ...COACHING_PRICES, ...SERVICE_PRICES, ...PUBLIC_PLANS.map(p => seededAmountLabel(p))])
    const quoted = [...MARKETING.matchAll(/>(\$\d[\d,]*)</g)].map(m => m[1])
    expect(quoted.length).toBeGreaterThan(0)
    for (const q of quoted) {
      expect(known.has(q), `marketing quotes ${q}, which is not one of the seeded plan prices`).toBe(true)
    }
  })

  it('every plan the product sells has a seeded row, including the one with no price', () => {
    /**
     * ENTERPRISE had no row at all, because the table only held prices and it has none. Once the
     * table also holds CAPS, "no row" cannot express "unlimited people, contact us" - so it has a
     * row with a null amount and a null cap, and this is what stops that being quietly reverted.
     */
    for (const plan of PUBLIC_PLANS) {
      expect(SEEDED_PLANS[plan], `${plan} has no seeded row`).toBeDefined()
      expect(SEEDED_PLANS[plan].amountCents, `${plan} should have a price`).not.toBeNull()
      expect(SEEDED_PLANS[plan].memberCap, `${plan} should have a seat cap`).not.toBeNull()
    }
    expect(SEEDED_PLANS.ENTERPRISE, 'ENTERPRISE has no seeded row').toBeDefined()
    expect(SEEDED_PLANS.ENTERPRISE.amountCents, 'ENTERPRISE must have no self-serve price').toBeNull()
    expect(SEEDED_PLANS.ENTERPRISE.memberCap, 'ENTERPRISE must be unlimited').toBeNull()
  })
})
