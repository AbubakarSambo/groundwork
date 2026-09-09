import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

/**
 * Lead-framing guard (piece 2). LeadConfirmView had one sentence of framing;
 * the dead LeadOnboardingChat carried the manager's privacy contract, which
 * existed nowhere else on the live path: "you'll see submission status, not
 * their words, what people write stays private until the report is ready." Port it in.
 *
 * THE WORD CHANGED, THE CONTRACT DID NOT. It said "accounts stay private", and "account" is banned
 * in copy a person reads: it means their account of what happened and in a product it reads as a
 * login. What this file protects is the three promises, so it matches on those rather than on the
 * word that used to carry one of them.
 * Source-level guard (co-located inside LeadConfirmView, near the existing
 * one-sentence framing) so deleting or moving it out bites.
 */
const src = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'GroundAdminPage.tsx'),
  'utf8',
)

describe('LEAD-FRAMING: LeadConfirmView explains what Groundwork is and the privacy contract', () => {
  it('states what Groundwork is (independent accounts, shown where they agree/differ)', () => {
    expect(src).toMatch(/records what each person says about a situation independently/i)
    expect(src).toMatch(/shows where they agree and where they differ/i)
  })

  it('states the manager privacy contract: sees submission status, not what was written', () => {
    expect(src).toMatch(/you will see who has checked in/i)
    expect(src).toMatch(/you will not see what anyone wrote/i)
    expect(src).toMatch(/what people write stays private until the report is ready/i)
  })

  it('the framing sits inside LeadConfirmView, before the context editor', () => {
    const viewStart = src.indexOf('function LeadConfirmView')
    const framing = src.indexOf('records what each person says about a situation independently')
    const contextLabel = src.indexOf('Context (edit if needed)')
    expect(viewStart).toBeGreaterThan(-1)
    expect(framing).toBeGreaterThan(viewStart)
    expect(framing).toBeLessThan(contextLabel)
  })
})
