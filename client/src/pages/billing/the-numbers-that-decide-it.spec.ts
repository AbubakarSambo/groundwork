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
  it('the row is not gated on already having a subscription', () => {
    const row = code.slice(code.indexOf("label=\"Plan\"") - 600, code.indexOf("label=\"Plan\""))
    /* The gate moved onto the plan tile itself, which is the only one that needs a plan. */
    expect(row).not.toMatch(/\{\(isSubscribed \|\| isPaused\) && \(\s*<div style=\{\{ display: 'flex', gap: 10/)
  })

  it('shows people against the cap, which a free account has too', () => {
    expect(code).toContain('billingStatus.people.count} of ${billingStatus.people.cap')
  })

  it('shows what the account has actually done, not only what it costs', () => {
    /* An admin asked to pay for a year has to be able to say what was got for it. */
    const usage = code.slice(code.indexOf("label=\"Check-ins\""), code.indexOf("label=\"Check-ins\"") + 700)
    expect(usage).toContain('usage.checkIns')
    expect(usage).toContain('reportsReleased')
    expect(usage).toContain('peopleTakingPart')
  })
})
