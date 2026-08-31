import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'

/**
 * THE BILLING PAGE MUST NOT TELL A PAYING CUSTOMER THEY ARE NOT PAYING. W-UX-5.
 *
 * Two faults, both on the one screen whose entire job is to say what is being charged for:
 *
 *  1. Every check-in was labelled "Free check-in" on a paid plan. `isFreeGround` is a stamp left on
 *     the row from the day it was opened, and it was tested before the subscription - so an org that
 *     started free and then subscribed saw the label on everything it had ever created.
 *  2. "On the card ending below", with no card below or anywhere else. Stripe is not wired, so this
 *     page has never shown a payment method.
 */
const CODE = readFileSync(join(__dirname, 'BillingPage.tsx'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

describe('what the org pays now decides what the badge says', () => {
  it('the subscription is tested before the free stamp, not after', () => {
    const sub = CODE.indexOf('{isSubscribed ? (')
    const free = CODE.indexOf('Free check-in')
    expect(sub).toBeGreaterThan(-1)
    expect(free).toBeGreaterThan(-1)
    expect(sub).toBeLessThan(free)
  })

  it('and the free label survives for the accounts it is actually true of', () => {
    /** The fix is an ORDER, not a deletion. A free org must still see which check-ins are free. */
    expect(CODE).toContain('Free check-in')
    expect(CODE).toMatch(/isFree \? \(/)
  })
})

describe('nothing points at a card that is not there', () => {
  it('the renewal caption does not refer to a payment method the page never shows', () => {
    expect(CODE).not.toContain('On the card ending below')
    /** Guard the reason, not just the string: if a card ever IS shown, this may be relaxed. */
    expect(CODE).not.toMatch(/last4|cardBrand/)
  })
})
