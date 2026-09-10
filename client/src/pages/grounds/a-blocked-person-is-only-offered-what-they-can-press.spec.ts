import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * A BLOCKED PERSON IS ONLY OFFERED WHAT THEY CAN PRESS.
 *
 * The paywall overlay rendered "Continue for free" and "Upgrade organisation" for any initiator, while
 * both routes behind them are admin-only - so in an organisation where anyone may open a check-in, a
 * blocked person was shown two buttons that could only 403. And the other branch said "Your initiator
 * has been notified", which nothing did. The rule is the server's rule, once; the sentence is the
 * true one.
 */
const PAGE = readFileSync(join(__dirname, 'GroundParticipantPage.tsx'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')

describe('the paywall overlay', () => {
  /* From the overlay to the end of the file: setShowPaywall(false) also appears earlier, in a handler. */
  const overlay = PAGE.slice(PAGE.indexOf('{showPaywall && ('))

  it('gates the buttons on the server’s own rule: an initiator who is also an admin', () => {
    expect(PAGE).toMatch(/const canPayHere = isInitiator && user\?\.role === 'ADMIN'/)
    expect(overlay).toMatch(/\{canPayHere \? \(/)
  })

  it('and the access-code field on the same rule, so nobody hunts for a code they were never issued', () => {
    expect(overlay).toMatch(/\{canPayHere && \(\s*<div style=\{\{ borderTop/)
    expect(overlay).not.toMatch(/myParticipant\?\.partyType === 'INITIATOR' &&/)
  })

  it('tells everybody else the true fact and nothing more', () => {
    expect(overlay).toContain('Only an organisation admin can add sessions. We have told them you are waiting.')
    expect(PAGE).not.toContain('Your initiator has been notified')
  })
})
