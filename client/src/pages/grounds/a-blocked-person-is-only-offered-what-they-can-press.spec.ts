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
/**
 * REVIEW ROUND 3, ITEM 2: THE OVERLAY ITSELF MOVED TO A SHARED COMPONENT, so GroundAdminPage.tsx
 * can show the same one for the lead's own session. `canPayHere` (the gate) still lives on each
 * page, computed the same way, and is passed in as a prop; what the overlay DOES with it - which
 * buttons show, which sentence a blocked non-admin reads - is asserted here against the one
 * shared copy rather than against each page's now-identical gate.
 */
const OVERLAY = readFileSync(join(__dirname, '../../components/gw/checkin/SessionPaywallModal.tsx'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')

describe('the paywall overlay', () => {
  it('gates the buttons on the server’s own rule: an initiator who is also an admin', () => {
    expect(PAGE).toMatch(/const canPayHere = isInitiator && user\?\.role === 'ADMIN'/)
    expect(OVERLAY).toMatch(/\{canPayHere \? \(/)
  })

  it('and the access-code field on the same rule, so nobody hunts for a code they were never issued', () => {
    expect(OVERLAY).toMatch(/\{canPayHere && \(\s*<div style=\{\{ borderTop/)
    expect(OVERLAY).not.toMatch(/myParticipant\?\.partyType === 'INITIATOR' &&/)
  })

  it('tells everybody else the true fact and nothing more', () => {
    expect(OVERLAY).toContain('Only an organisation admin can add sessions. We have told them you are waiting.')
    expect(OVERLAY).not.toContain('Your initiator has been notified')
  })
})
