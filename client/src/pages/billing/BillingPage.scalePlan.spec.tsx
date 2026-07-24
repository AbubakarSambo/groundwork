import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

/**
 * #17: SCALE is a fully implemented subscription plan server-side
 * (billing.service.ts) and already has label/price/cap entries in the
 * client's PLAN_LABELS/PLAN_PRICES/PLAN_MEMBER_CAPS maps - it was just
 * missing from BillingPage's own PLANS array, so no org could ever pick it.
 */
const src = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'BillingPage.tsx'),
  'utf8',
)

describe('#17 SCALE plan is selectable on the billing page', () => {
  it('includes SCALE in the PLANS array', () => {
    const plansLine = src.split('\n').find(l => l.includes('const PLANS'))
    expect(plansLine).toBeTruthy()
    expect(plansLine).toMatch(/'SCALE'/)
  })
})
