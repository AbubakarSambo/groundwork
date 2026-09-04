import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * THE PRODUCT WARNED PEOPLE ABOUT A CHARGE THAT DOES NOT HAPPEN.
 *
 * Three places on the release path said "Billing activates on release" - the forming-state
 * explanation, the ready-state explanation, and the confirmation dialog, which is the last thing
 * somebody reads before an irreversible action.
 *
 * It is not true. Releasing emits a REPORT_RELEASED usage event and nothing consumes it for billing.
 * The API says so in its own comments: free-tier check-ins have unlimited sessions and "are never
 * metered or paywalled - the 10-ground cap (canCreateGround) is the only free-tier limit", and a
 * subscribed organisation has unlimited sessions with no balance check. The limit is counted when a
 * check-in is CREATED, where the person is already told about it.
 *
 * The audit filed this as a trust problem about disclosing a charge too late, and recommended moving
 * the sentence earlier. Checking the billing code before writing that sentence somewhere new is what
 * found that there is no charge to disclose. Warning somebody about money on an irreversible action
 * that costs nothing is worse than silence: it makes them hesitate over the one thing the product
 * needs them to do, and it is false.
 *
 * Comments stripped: this file quotes the sentence it protects against.
 */
const SRC = readFileSync(join(__dirname, 'GroundAdminPage.tsx'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')

describe('nothing is charged on release', () => {
  it('the release path makes no claim about billing', () => {
    expect(SRC).not.toMatch(/billing activates/i)
    expect(SRC).not.toMatch(/billed when you release/i)
    expect(SRC).not.toMatch(/charged (on|when you) releas/i)
  })

  it('and still says the two things that are true about it', () => {
    /* Irreversible, and simultaneous. Those are the facts worth carrying into the decision. */
    expect(SRC).toContain('This cannot be undone.')
    expect(SRC).toMatch(/at the same moment/)
  })
})
