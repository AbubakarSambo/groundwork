import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'
import { PLAN_PRICES, PLAN_MEMBER_CAPS, type SubscriptionPlan } from './billing'

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
      const amount = PLAN_PRICES[plan].split('/')[0]
      expect(MARKETING).toContain(`>${amount}<`)
    })

    it(`${plan} seats the same number of people in both places`, () => {
      expect(MARKETING).toContain(PLAN_MEMBER_CAPS[plan])
    })
  }

  it('and does not quote a price the app has never heard of', () => {
    // Plus $0, the free tier, which has no SubscriptionPlan because nobody
    // subscribes to it - it is what an organisation has before it pays.
    const known = new Set(['$0', ...PUBLIC_PLANS.map(p => PLAN_PRICES[p].split('/')[0])])
    const quoted = [...MARKETING.matchAll(/>(\$\d[\d,]*)</g)].map(m => m[1])
    expect(quoted.length).toBeGreaterThan(0)
    for (const q of quoted) {
      expect(known.has(q), `marketing quotes ${q}, which is not one of the app's plan prices`).toBe(true)
    }
  })
})
