import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * PARTICIPANTS ARE NEVER CHARGED.
 *
 * Not a pricing preference - a product rule. A participant gives their account
 * and the organisation pays for the check-in; the person answering the questions
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
/* The page and the record it renders. `MyRecord` was lifted out of this page so the view that runs
   a check-in can show a lead their own account; a paywall could now appear in either file.
   REVIEW ROUND 3, ITEM 2: THE PAYWALL OVERLAY ITSELF MOVED to a shared component so
   GroundAdminPage.tsx could show the lead's own paywall without a trip through this page - so
   that is where the "Have an access code" field and "We have told them you are waiting" text
   actually live now. `canPayHere` (the gate a participant page passes in) still lives here. */
const SRC = [
  readFileSync(join(__dirname, 'GroundParticipantPage.tsx'), 'utf8'),
  readFileSync(join(__dirname, '..', '..', 'components', 'gw', 'MyRecord.tsx'), 'utf8'),
  readFileSync(join(__dirname, '..', '..', 'components', 'gw', 'checkin', 'SessionPaywallModal.tsx'), 'utf8'),
].join('\n')

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

  it('keeps the access code behind the rule that gates paying here', () => {
    // The code exists and is legitimate - for admins and leads. What must not
    // happen is a participant being shown the field. The guard is `canPayHere`
    // now - an initiator who is also an admin, the server's own rule for the
    // routes behind the buttons - which is stricter than the initiator check
    // this used to pin, not looser.
    expect(CODE).toMatch(/const canPayHere = isInitiator && user\?\.role === 'ADMIN'/)
    const i = CODE.indexOf('Have an access code')
    expect(i).toBeGreaterThan(-1)
    const before = CODE.slice(0, i)
    const lastGuard = before.lastIndexOf('canPayHere &&')
    /* Indentation-agnostic now that the overlay lives in its own file (SessionPaywallModal.tsx),
       not nested inside GroundParticipantPage.tsx's own JSX - the ") : (" that closes the
       non-admin branch no longer sits at a fixed column. */
    const lastElse = before.lastIndexOf(') : (')
    expect(lastGuard).toBeGreaterThan(lastElse)
  })

  it('still tells a blocked participant what is happening, without a price', () => {
    // The right message for someone who cannot check in: the people who can act
    // have been told. It said "your initiator has been notified" - and nothing
    // notified the initiator. The server tells the organisation's admins, so
    // that is what is said. Never "buy a session".
    expect(SRC).toMatch(/I have told them you are waiting/) /* one voice, "I" (S15, 7 November) */
  })
})
