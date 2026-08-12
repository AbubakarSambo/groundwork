import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'
import { PLAN_LABELS, PLAN_MEMBER_CAPS, PLAN_PRICES, type SubscriptionPlan } from './billing'

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
 * WHAT THIS DOES NOT CLAIM. It does not check that either page matches what is actually CHARGED:
 * `billing.service.ts` on the API decides that, and a plan's price living in three places is a
 * separate problem this does not pretend to solve. It checks that the two things a customer can
 * READ say the same thing.
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

  const html = existsSync(MARKETING) ? readFileSync(MARKETING, 'utf8') : ''

  for (const plan of PAID) {
    it(`${PLAN_LABELS[plan]} costs the same on both`, () => {
      // "$25/mo" in the app, "$25" then "/mo" in separate spans on the marketing page.
      const amount = PLAN_PRICES[plan].replace('/mo', '')
      const label = PLAN_LABELS[plan]

      expect(html, `the marketing page does not name the ${label} plan at all`).toContain(label)
      expect(
        html.includes(amount),
        `the app says ${label} is ${PLAN_PRICES[plan]} and the marketing page does not mention ${amount}`,
      ).toBe(true)
    })

    it(`${PLAN_LABELS[plan]} holds the same number of people on both`, () => {
      // The seat cap is the other number a buyer decides on, and it is written out in prose
      // on the marketing page: "Up to 20 people".
      const cap = PLAN_MEMBER_CAPS[plan]
      expect(
        html.includes(cap),
        `the app says ${PLAN_LABELS[plan]} is "${cap}" and the marketing page does not say that anywhere`,
      ).toBe(true)
    })
  }

  it('and the free tier says ten Grounds in both places', () => {
    /**
     * The free tier is the one somebody actually signs up on, and its claim has been wrong
     * before: reviewing this product I read a stale note, concluded "unlimited sessions"
     * contradicted the billing rules, and had rewritten BOTH pages to advertise "$5 per extra
     * session" before checking `billing.service.ts`, which never meters a free ground. The copy
     * was right and I was wrong - but two independent copies is how that kind of mistake ships.
     */
    expect(html).toMatch(/10 Grounds/)
    expect(html).toMatch(/[Uu]nlimited sessions/)
  })
})
