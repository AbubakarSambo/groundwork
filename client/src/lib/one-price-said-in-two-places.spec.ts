import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { COACH_CARD } from './scenario-catalog'

/**
 * TWO PRICES FOR ONE THING, AND ONE OF THEM INSIDE THE PRODUCT.
 *
 * The coach card in the setup flow said coaching was $5,000 a year and $500 an hour. The pricing
 * page said $7,500 and $700. Both were written carefully, months apart, and neither knew about the
 * other - which is what happens to a number that lives in two files.
 *
 * A person who reads the card and then the page has no way to tell which is real, and the one they
 * will remember is the cheaper one. That is not a copy problem, it is a quote somebody may hold us
 * to.
 *
 * This does not merge the two - a marketing page and a product string are allowed to be worded
 * differently. It checks that the NUMBERS in one appear in the other, which is the only part that
 * cannot be allowed to disagree.
 */
const PRICING = readFileSync(
  join(__dirname, '..', '..', '..', 'marketing', 'src', 'pages', 'pricing.astro'),
  'utf8',
)

/** Every money figure the pricing page shows, so the test cannot be fooled by a stale constant. */
function moneyOn(page: string): Set<string> {
  return new Set([...page.matchAll(/\$[0-9][0-9,]*/g)].map((m) => m[0]))
}

describe('coaching costs the same in the product as on the site', () => {
  it('finds the pricing page at all', () => {
    expect(PRICING.length).toBeGreaterThan(1000)
    expect(moneyOn(PRICING).size).toBeGreaterThan(3)
  })

  it('every figure the coach card quotes is a figure the pricing page shows', () => {
    const onTheCard = [...COACH_CARD.cost.matchAll(/\$[0-9][0-9,]*/g)].map((m) => m[0])
    expect(onTheCard.length).toBeGreaterThan(0)
    for (const figure of onTheCard) {
      expect(moneyOn(PRICING)).toContain(figure)
    }
  })

  it('and the card still says the software works without it', () => {
    /* The card is inside a flow somebody is already using. It must not read as a gate. */
    expect(COACH_CARD.cost).toContain('works without it')
  })
})
