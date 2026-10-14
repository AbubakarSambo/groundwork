import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'
import { PLAN_LABELS, type SubscriptionPlan } from './billing'
import { seededAmountLabel, seededSeatsIncludedLabel } from './pricing-seed.testonly'

/**
 * THE PRICE IS WRITTEN TWICE. IT MUST NOT BE ABLE TO DISAGREE. W13-10.
 *
 * The tiers exist in two repositories: `client/src/api/billing.ts`, which the in-app pricing page
 * and Billing both read, and `marketing/src/pages/pricing.astro`, which hand-writes the same
 * numbers in HTML. Two builds, two deploys, no connection - so a price could be raised in the app
 * and left standing on the public site, and nothing would notice until a customer did.
 *
 * WHY NOT ONE SHARED MODULE, which is what my own plan said. The two are separate packages with
 * separate builds; importing across them means either a build-time coupling or a copied file that
 * drifts exactly as badly. What actually prevents the harm is not sharing the data, it is making
 * disagreement fail - the same shape as the postbuild check that reads the built marketing site.
 *
 * WHAT THIS USED NOT TO CLAIM, AND NOW DOES. It compared the marketing page to two hardcoded maps
 * on the client, so it only ever proved the two things a customer can READ agreed with each other.
 * Both prices and caps now live in `pricing_plans`, seeded by migration, so the comparison is
 * against the values that are actually charged and actually enforced. The caps are included
 * deliberately: they are the half of pricing that had already drifted, with Scale advertising
 * 1,000 people in three places.
 */

const MARKETING = join(__dirname, '../../../marketing/src/pages/pricing.astro')
const PAID: SubscriptionPlan[] = ['STARTER', 'SMALL_TEAM', 'GROWTH', 'BUSINESS', 'SCALE']

describe('the public pricing page and the in-app one', () => {
  it('the marketing page is where this expects it', () => {
    /**
     * If the file moves, this check must fail loudly rather than pass on an empty string - a
     * silent skip is how a stale price would ship.
     */
    expect(existsSync(MARKETING), `${MARKETING} is not there any more - move this check with it`).toBe(true)
  })

  const html = existsSync(MARKETING) ? readFileSync(MARKETING, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '') : ''

  for (const plan of PAID) {
    it(`${PLAN_LABELS[plan]} costs the same on both`, () => {
      // "$25" then "/mo" in separate spans on the marketing page.
      const amount = seededAmountLabel(plan)
      const label = PLAN_LABELS[plan]

      expect(amount, `${plan} has no seeded amount`).not.toBeNull()
      expect(html, `the marketing page does not name the ${label} plan at all`).toContain(label)
      expect(
        html.includes(amount!),
        `the database seeds ${label} at ${amount}/mo and the marketing page does not mention ${amount}`,
      ).toBe(true)
    })

    it(`${PLAN_LABELS[plan]} holds the same number of people on both`, () => {
      // The seat cap is the other number a buyer decides on, and it is written out in prose
      // on the marketing page: "Up to 20 people".
      /* Changed 15 October (fix list item 6): the pages say "20 seats included" now that any plan can add seats. */
      const cap = seededSeatsIncludedLabel(plan)
      expect(
        html.includes(cap),
        `the database seeds ${PLAN_LABELS[plan]} at "${cap}" and the marketing page does not say that anywhere`,
      ).toBe(true)
    })
  }

  /* Changed 15 October (fix list item 6): the free tier's ten check-ins gave way to one free month, WhatsApp included, on the
     public page, as the light prototype (s74) says. The in-app page says the same from the trial setting. */
  it('and the free month says one month, WhatsApp included', () => {
    /**
     * The free tier is the one somebody actually signs up on, and its claim has been wrong
     * before: reviewing this product I read a stale note, concluded "unlimited sessions"
     * contradicted the billing rules, and had rewritten BOTH pages to advertise "$5 per extra
     * session" before checking `billing.service.ts`, which never meters a free ground. The copy
     * was right and I was wrong - but two independent copies is how that kind of mistake ships.
     *
     * The noun changed when "Ground" left customer-facing copy. The subject is unchanged: both
     * pages must state the same free-tier claim. Worth noting the unit did NOT change - the meter
     * counts containers, and a container is what a check-in now means, so ten is still ten.
     */
    expect(html).toMatch(/1 month free, WhatsApp included, no card required/)
    expect(html).toMatch(/[Uu]nlimited sessions/)
    expect(html).not.toMatch(/3 months/)
  })
})
