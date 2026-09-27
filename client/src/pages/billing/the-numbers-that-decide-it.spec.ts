import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * THE PAGE WHERE SOMEBODY DECIDES WHETHER TO PAY FOR 160 PEOPLE.
 *
 * It could say what a plan costs and not what this organisation has. The stat row - plan, people
 * against the cap, when it renews - was behind `isSubscribed || isPaused`, so the one number that
 * decides an upgrade was hidden from everybody who had not upgraded.
 */
const PAGE = readFileSync(join(__dirname, 'BillingPage.tsx'), 'utf8')
const code = PAGE.replace(/\/\*[\s\S]*?\*\//g, ' ')

describe('the numbers show before somebody pays, not after', () => {
  /*
   * U.19: the stat row became the prototype's "Your plan" rows (settings-billing.txt): "Plan" says
   * the plan and the people against the cap in one sentence, for every organisation, and "So far"
   * says what the account has done. The sentences themselves are checked as each reader reads them
   * in plan-and-billing-as-each-reader-sees-it.spec.tsx; this keeps the two things the old checks
   * were for.
   */
  it('the plan line, with people against the cap, is not gated on already having a subscription', () => {
    const row = code.slice(code.indexOf('<b>Plan</b>') - 200, code.indexOf('<b>Plan</b>') + 400)
    expect(row).toContain('thePlanLine(billingStatus, livePricing, freeGrounds)')
    expect(code.slice(code.indexOf('<b>Plan</b>') - 300, code.indexOf('<b>Plan</b>'))).not.toMatch(/isSubscribed \|\| isPaused\) &&/)
  })

  it('shows what the account has actually done, not only what it costs', () => {
    /* An admin asked to pay for a year has to be able to say what was got for it. */
    const usage = code.slice(code.indexOf('<b>So far</b>'), code.indexOf('<b>So far</b>') + 700)
    expect(usage).toContain('usage.checkIns')
    expect(usage).toContain('reportsReleased')
    expect(usage).toContain('peopleTakingPart')
  })
})
