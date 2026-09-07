import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { COACH_CARD } from './scenario-catalog'
import { COACHING_PRICE } from '../api/coach'

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
const MARKETING = join(__dirname, '..', '..', '..', 'marketing', 'src')
const PRICING = readFileSync(join(MARKETING, 'pages', 'pricing.astro'), 'utf8')

/**
 * THE NUMBERS COME FROM THE MODULE THE PAGE RENDERS, NOT FROM THE PAGE'S SOURCE.
 *
 * This read the .astro file for literal figures, which worked until the page started rendering
 * `{SERVICES.coachingRetainer}` instead of typing $7,500 - at which point the guard saw no coaching
 * price at all and failed, on a page that was more correct than before. A guard that punishes the
 * fix is worse than no guard.
 */
const SERVICES: Record<string, string> = Object.fromEntries(
  [...readFileSync(join(MARKETING, 'site.mjs'), 'utf8')
    .matchAll(/(\w+):\s*'(\$[0-9][0-9,]*)'/g)].map((m) => [m[1], m[2]]),
)

function moneyOn(page: string): Set<string> {
  return new Set([
    ...[...page.matchAll(/\$[0-9][0-9,]*/g)].map((m) => m[0]),
    ...Object.values(SERVICES),
  ])
}

describe('coaching costs the same in the product as on the site', () => {
  it('finds the pricing page and the shared numbers', () => {
    expect(PRICING.length).toBeGreaterThan(1000)
    expect(moneyOn(PRICING).size).toBeGreaterThan(3)
    expect(Object.keys(SERVICES).length).toBeGreaterThanOrEqual(3)
  })

  it('the page renders the shared numbers rather than retyping them', () => {
    /* The whole point of the module: a price typed onto the page is a second copy again. */
    for (const key of Object.keys(SERVICES)) {
      expect(PRICING, `SERVICES.${key} is defined and the page never renders it`).toContain(`{SERVICES.${key}}`)
    }
  })

  it('says each price once, because twice is how they drift apart', () => {
    /*
     * The coaching figures were in two sections of this page at the same time - the Guided
     * comparison and the services block - which is the same duplication that had the retainer
     * wrong in three files. The comparison explains the difference and the services block carries
     * the numbers.
     */
    for (const figure of Object.values(SERVICES)) {
      const times = [...PRICING.matchAll(new RegExp(figure.replace('$', '\\$'), 'g'))].length
      expect(times, `${figure} is typed on the pricing page ${times} times`).toBe(0)
    }
  })

  it('every figure the coach card quotes is a figure the pricing page shows', () => {
    const onTheCard = [...COACH_CARD.cost.matchAll(/\$[0-9][0-9,]*/g)].map((m) => m[0])
    expect(onTheCard.length).toBeGreaterThan(0)
    for (const figure of onTheCard) {
      expect(moneyOn(PRICING)).toContain(figure)
    }
  })

  /*
   * AND EVERYWHERE ELSE A COACH PRICE IS QUOTED.
   *
   * The version of this guard that caught the card looked at the card alone, so two other copies
   * stayed wrong for months: the request form's `COACHING_PRICE` and the confirmation email the API
   * sends, both saying $5,000 and $500. A guard scoped to the one place a fault was found is a
   * guard that waits for the next place.
   */
  it('the coach request form quotes the pricing page\'s figures', () => {
    const quoted = [...`${COACHING_PRICE.hourly} ${COACHING_PRICE.retained}`.matchAll(/\$[0-9][0-9,]*/g)].map((m) => m[0])
    expect(quoted.length).toBeGreaterThan(1)
    for (const figure of quoted) expect(moneyOn(PRICING)).toContain(figure)
  })

  it('and so does the confirmation email the API sends', () => {
    const email = readFileSync(
      join(__dirname, '..', '..', '..', 'api', 'src', 'modules', 'email', 'email.service.ts'),
      'utf8',
    )
    const from = email.indexOf('async sendCoachRequestReceived')
    expect(from, 'the coach confirmation email has moved or been renamed').toBeGreaterThan(-1)
    const body = email.slice(from, email.indexOf('\n  async ', from + 10))
    const quoted = [...body.matchAll(/\$[0-9][0-9,]*/g)].map((m) => m[0])
    expect(quoted.length, 'the email quotes no price at all, which is its own problem').toBeGreaterThan(0)
    for (const figure of quoted) expect(moneyOn(PRICING)).toContain(figure)
  })

  it('and the card still says the software works without it', () => {
    /* The card is inside a flow somebody is already using. It must not read as a gate. */
    expect(COACH_CARD.cost).toContain('works without it')
  })
})
