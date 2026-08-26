import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'
import { formatMonthlyPrice } from './billing'

/**
 * ONE PRICE, ONE FORMAT. W-UX-7.
 *
 * Seen on the running back office: "$1650/mo", while the customer billing page said "$1,650/mo" for
 * the same plan. `formatMonthlyPrice` had been written as the one formatter, with a comment saying
 * so - and the admin page had quietly kept a second one, which won on the only page where a
 * four-figure price is actually edited.
 *
 * THE REASON THE SECOND FUNCTION STILL EXISTS: a thousands separator inside a number input breaks
 * the value somebody is mid-way through typing. So it is kept for the edit field and named for it.
 * What must never happen again is a price being DISPLAYED through it.
 */
describe('the one formatter', () => {
  it('separates thousands', () => {
    expect(formatMonthlyPrice(165000)).toBe('$1,650/mo')
    expect(formatMonthlyPrice(2500)).toBe('$25/mo')
  })
})

describe('and the back office uses it', () => {
  const ADMIN = readFileSync(join(__dirname, '../pages/admin/AdminPage.tsx'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

  it('displays through the shared formatter, not a local one', () => {
    expect(ADMIN).toContain('formatMonthlyPrice(row.amountCents)')
    expect(ADMIN).not.toMatch(/\$\$\{cents\w*\(/)
  })

  it('and its local helper is named for the one job it is allowed to do', () => {
    /** `centsToDollarsStr` read like a general-purpose formatter, which is how it got used as one. */
    expect(ADMIN).not.toContain('centsToDollarsStr')
    expect(ADMIN).toContain('function centsForEditing')
  })
})
