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
  /* UPDATED, GROUP 1 REBUILD: each row is the shared `FieldRow` now (components/gw/ui), whose
     label is `label="Plan"` / `label="So far"` rather than kit.tsx's `<b>Plan</b>`. */
  it('the plan line, with people against the cap, is not gated on already having a subscription', () => {
    const row = code.slice(code.indexOf('label="Plan"') - 200, code.indexOf('label="Plan"') + 400)
    expect(row).toContain('thePlanLine(billingStatus, livePricing, freeGrounds)')
    expect(code.slice(code.indexOf('label="Plan"') - 300, code.indexOf('label="Plan"'))).not.toMatch(/isSubscribed \|\| isPaused\) &&/)
  })

  it('shows what the account has actually done, not only what it costs', () => {
    /* An admin asked to pay for a year has to be able to say what was got for it. */
    const usage = code.slice(code.indexOf('label="So far"'), code.indexOf('label="So far"') + 700)
    expect(usage).toContain('usage.checkIns')
    expect(usage).toContain('reportsReleased')
    expect(usage).toContain('peopleTakingPart')
  })
})
