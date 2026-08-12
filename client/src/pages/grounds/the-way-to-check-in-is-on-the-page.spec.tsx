import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'

/**
 * THE WAY TO CHECK IN IS ON THE PAGE YOU LAND ON. W8-76.
 *
 * Caught by the persona gate, not by me: suite_m failed with "the next-check-in affordance
 * EXISTS on the ground page (hard - absence is a failure, not a shrug)". It was right. I made
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
  it('the ground page passes its own open check-in, not null', () => {
    expect(strip(ADMIN)).toMatch(/openCheckInId=\{myOpenCheckIn && !myOpenOpensLater \? myOpenCheckIn\.id : null\}/)
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
  it('the ground page hands off rather than opening the session itself', () => {
    expect(strip(ADMIN)).toMatch(/navigate\(`\/grounds\/\$\{id\}\/p\?open=1`\)/)
  })

  it('the ground page does not grow its own copy of the paywall', () => {
    // The specific thing to never duplicate: the 403 branch that offers a free extension,
    // an access code, or a subscription.
    expect(strip(ADMIN)).not.toContain('freeExtensionAvailable')
    expect(strip(ADMIN)).not.toContain('setShowPaywall')
  })

  it('and the participant page fires the probe once, from a ref', () => {
    // Not from the query key: probeSession navigates on success, and a re-render before the
    // navigation lands would open two sessions from one click - one of them chargeable.
    expect(strip(PARTICIPANT)).toMatch(/const autoOpenFired = useRef\(false\)/)
    expect(strip(PARTICIPANT)).toMatch(/autoOpenFired\.current = true\s*\n\s*probeSession\.mutate/)
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
