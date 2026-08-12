import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * PARTICIPANTS ARE NEVER CHARGED.
 *
 * Not a pricing preference - a product rule. A participant gives their account
 * and the organisation pays for the ground; the person answering the questions
 * is never the person at the till.
 *
 * Two leftovers from an abandoned model had crept onto their page:
 *   - "Unlock insights for $25/mo" on the record tab, shown to anyone whose
 *     record was still empty, i.e. someone deciding whether to start at all. It
 *     called a one-off purchase endpoint, so the label was wrong twice over.
 *   - The contributor-code field, which is an admin/lead instrument for
 *     bypassing a payment block, rendered outside the initiator branch and so
 *     sent plain participants hunting for a code nobody had issued them.
 *
 * This reads the source rather than rendering, deliberately: the point is that
 * no price can reach a participant by ANY path through this page, including
 * paths a test would have to contrive a state to reach.
 */
const SRC = readFileSync(
  join(__dirname, 'GroundParticipantPage.tsx'),
  'utf8',
)

/** Source with comment lines stripped, so our own explanations do not count. */
const CODE = SRC.split('\n')
  .filter(l => {
    const t = l.trim()
    return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*')
  })
  .join('\n')

describe('nothing on the participant page asks them for money', () => {
  it('offers no personal subscription', () => {
    expect(CODE).not.toMatch(/\$\d+\s*\/\s*mo/i)
    expect(CODE).not.toMatch(/Unlock insights/i)
  })

  it('keeps the empty-record state, which is not a paywall', () => {
    // insightsLocked means "record still empty", NOT "unpaid" - it stays. What
    // must not return is a price attached to it.
    expect(CODE).toMatch(/insightsLocked/) // the flag is legitimate: "no completed session yet"
  })

  it('keeps the access code inside the initiator branch', () => {
    // The code exists and is legitimate - for admins and leads. What must not
    // happen is a participant being shown the field.
    const i = CODE.indexOf('Have an access code')
    expect(i).toBeGreaterThan(-1)
    const before = CODE.slice(0, i)
    const lastGuard = before.lastIndexOf("myParticipant?.partyType === 'INITIATOR'")
    const lastElse = before.lastIndexOf('            ) : (')
    expect(lastGuard).toBeGreaterThan(lastElse)
  })

  it('still tells a blocked participant what is happening, without a price', () => {
    // The right message for someone who cannot check in: their initiator has
    // been told. Never "buy a session".
    expect(SRC).toMatch(/initiator has been notified/i)
  })
})
