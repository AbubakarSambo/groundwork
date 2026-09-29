import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'

/**
 * THE WAY TO CHECK IN IS ON THE PAGE YOU LAND ON. W8-76.
 *
 * Caught by the persona gate, not by me: suite_m failed with "the next-check-in affordance
 * EXISTS on the check-in page (hard - absence is a failure, not a shrug)". It was right. I made
 * Chat the landing tab on the lead's ground page and passed `openCheckInId={null}`, so a lead
 * who is also a party - the commonest kind, since setup offers "I am a party" - opened their
 * ground and had no way to start their own check-in.
 *
 * Two more things came out of it:
 *
 * 1. THE BUTTON NEVER SAID "CHECK IN". It said "Continue session 3 of 12". Every other
 *    surface uses the product's own word: the tab is Check-ins, the email says your check-in
 *    is due, the header button says My check-ins. "Session 3" is our internal noun, and the
 *    gate looking for the real one was doing its job.
 *
 * 2. THE PAYWALL LIVES ON ONE PAGE AND MUST KEEP LIVING ON ONE PAGE. Opening a check-in goes
 *    through `probeSession`, where a 403 becomes the free-extension / access-code / subscribe
 *    modal. Copying that onto the lead's page would be a second copy of the payment path -
 *    which this plan already records nearly losing once. So the button hands off with
 *    `?open=1` and the participant page fires its own probe: one click, one implementation.
 */

const ADMIN = readFileSync(join(__dirname, 'GroundAdminPage.tsx'), 'utf8')
const PARTICIPANT = readFileSync(join(__dirname, 'GroundParticipantPage.tsx'), 'utf8')
const CHAT = readFileSync(join(__dirname, '../../components/gw/GroundChat.tsx'), 'utf8')
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

describe('the lead who is a party can start their check-in', () => {
  it('the check-in page passes its own open check-in, not null', () => {
    /**
     * ROUND 4, ITEM A STEP 3: NOW A NAMED CONST, READ BY THE REDIRECT, NOT A JSX PROP TO
     * GroundChat. Same computation, computed once (also used by "who is in this"'s
     * `notOpenYet`), rather than inlined three times.
     */
    expect(strip(ADMIN)).toMatch(/const myOpenCheckInId = myOpenCheckIn && !myOpenOpensLater \? myOpenCheckIn\.id : null/)
  })

  it('and it is narrowed to THEIR check-in, since a check-in is per person per session', () => {
    expect(strip(ADMIN)).toMatch(/c\.participantId === myParticipantId && c\.status !== 'COMPLETED'/)
  })

  it('a session that has not opened yet is not offered as if it had', () => {
    expect(strip(ADMIN)).toMatch(/myOpenOpensLater/)
  })
})

describe('the button says what the rest of the product says', () => {
  it('it uses the word "check in"', () => {
    expect(strip(CHAT)).toMatch(/Check in for session \$\{openSessionNumber\}/)
    expect(strip(CHAT)).toMatch(/'Check in now →'/)
  })

  it('and no longer leads with our internal noun', () => {
    expect(strip(CHAT)).not.toMatch(/`Continue session \$\{/)
  })
})

describe('the handoff, and the payment path it protects', () => {
  /**
   * REVIEW ROUND 3, ITEM 2: THE HAND-OFF IS GONE. "One page per check-in: the lead's Check-in
   * tab opens her own conversation (/checkin/:id) directly, like a party's, and never lands on
   * the participant page." The `?open=1` trip to `/grounds/:id/p` existed only to borrow that
   * page's paywall-aware `probeSession` - both pages now call the same shared hook
   * (`useOpenSession.ts`), so neither needs the other's page to open a session.
   */
  it('the check-in tab opens the session itself, through the shared hook - it does not hand off to the other page', () => {
    expect(strip(ADMIN)).toContain("useOpenSession(id)")
    expect(strip(ADMIN)).not.toMatch(/\/grounds\/\$\{id\}\/p\?open=1/)
  })

  it('the check-in page does not grow its own copy of the paywall', () => {
    // The specific thing to never duplicate: the 403 branch that offers a free extension,
    // an access code, or a subscription. Both pages import the same hook and modal now rather
    // than each carrying its own copy of this logic.
    expect(strip(ADMIN)).not.toContain('freeExtensionAvailable')
    expect(strip(ADMIN)).not.toContain('setShowPaywall')
  })

  it('and the participant page fires the probe once, from a ref', () => {
    // Not from the query key: opening a session navigates on success, and a re-render before the
    // navigation lands would open two sessions from one click - one of them chargeable.
    expect(strip(PARTICIPANT)).toMatch(/const autoOpenFired = useRef\(false\)/)
    expect(strip(PARTICIPANT)).toMatch(/autoOpenFired\.current = true\s*\n\s*openSession\(/)
  })

  it('with every hook above every conditional return', () => {
    /**
     * The mistake this file records twice over: my first version put these hooks next to
     * `dueNow`, below `if (isLoading) return`, so the hook order changed between renders and
     * three unrelated specs went red with "React has detected a change in the order of
     * Hooks". Same slip as earlier in this session.
     */
    const code = strip(PARTICIPANT)
    expect(code.indexOf('const autoOpenFired = useRef(false)')).toBeLessThan(code.indexOf('if (isLoading) return'))
  })
})
