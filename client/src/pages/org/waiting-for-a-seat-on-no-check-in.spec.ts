import { describe, it, expect } from 'vitest'
import { howManyHere } from './EveryoneHere'

/**
 * Release check, 9 October. Fieldnote Studio's trial ended with six people added after the release, and People read "7 people, on the
 * free plan, which is for up to 1. 6 more are on a check-in with no seat for them." None of them was on a check-in. Lakeview's kept
 * invitation read "Omondi is on a check-in with no seat for them." The server's sentence (request 197) is said instead.
 */
describe('People says who waits for a seat, and why, truly', () => {
  it('says the server\'s sentence when the plan is full, not "on a check-in"', () => {
    const said = howManyHere(7, null, 1, [], [], [], ['Ayo', 'Bisi', 'Ceci', 'Dayo', 'Efua', 'Femi'],
      '6 people are waiting for a seat because your plan is full. Choose a plan so everyone keeps checking in.')
    expect(said).toBe('7 people, on the free plan, which is for up to 1. 6 people are waiting for a seat because your plan is full. Choose a plan so everyone keeps checking in.')
    expect(said).not.toContain('on a check-in')
  })
  it('says a kept invitation waits for a seat, without a check-in it is not on', () => {
    expect(howManyHere(5, 'STARTER', 5, [], [], [], ['Omondi'])).toBe('5 people, on the Starter plan, which is for up to 5. Omondi is waiting for a seat on your plan.')
  })
  it('still names somebody added to a check-in with no seat', () => {
    expect(howManyHere(5, 'STARTER', 5, [], ['Juma'], [])).toBe('5 people, on the Starter plan, which is for up to 5. Juma is on a check-in with no seat for them.')
  })
})

describe('Plan and billing says the same sentence', () => {
  it('reads overThePlanSays from GET /billing/status before its own general line', async () => {
    const { readFileSync } = await import('fs')
    const { resolve } = await import('path')
    const source = readFileSync(resolve(__dirname, '../billing/BillingPage.tsx'), 'utf8')
    expect(source).toContain("billingStatus?.overThePlanSays?.trim() || 'More people have accounts here than this plan covers.'")
  })
})
