import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'

/**
 * ELEVEN ENDPOINTS' WORTH OF CODE WITH NO BUTTON. W-UX-C.
 *
 * The audit's line, and the two that mattered most:
 *
 *  - `authApi.updateProfile` - nothing in the product called it, so NOBODY COULD TELL US THEIR OWN
 *    NAME. Every name Groundwork held came from Google at sign-in, or from an admin typing it into
 *    an invite. That is the root of the complaint that started this whole pass: three screens showed
 *    email addresses because for half the people there genuinely was no name, and no way to give one.
 *    Fixing the display alone would have been the dishonest half of the job.
 *
 *  - `groundsApi.resendParticipantInvite` - live since GW-24, never called. What the roster offered
 *    instead was "Copy invite link", which makes the lead paste into their own mail client to handle
 *    the most ordinary failure there is: somebody did not see the email.
 *
 * THE RULE: an endpoint in `src/api` that nothing renders is either a missing button or dead code,
 * and either way somebody has to decide which. This checks these two are decided.
 */
const read = (p: string) =>
  readFileSync(join(__dirname, p), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

describe('a person can tell us their own name', () => {
  const SETTINGS = read('settings/SettingsPage.tsx')

  it('the endpoint is called from the page', () => {
    expect(SETTINGS).toContain('authApi.updateProfile({ firstName:')
  })

  it('with a field for each part of it', () => {
    expect(SETTINGS).toContain('aria-label="First name"')
    expect(SETTINGS).toContain('aria-label="Last name"')
  })

  /*
   * UPDATED (group 1 review): the help text now copies the prototype's own words exactly
   * ("This is what your team sees. A first name is enough.", own-settings.txt) rather than the
   * product's own longer sentence explaining what happens without one ("... Without it we can
   * only show your email address."). The fact this test protected - that a name is asked for
   * because it replaces an email address on screen - is still true of the product; it is just no
   * longer spelled out in this particular sentence, to match the prototype's own wording exactly.
   */
  it('says why a name is worth giving, in the prototype’s own words', () => {
    expect(SETTINGS).toContain('This is what your team sees. A first name is enough.')
  })

  it('a last name is not demanded', () => {
    /** One name is enough to stop a person being an address. Requiring two would refuse for nothing. */
    expect(SETTINGS).toContain('!nameChanged || !firstName.trim()')
    expect(SETTINGS).not.toMatch(/!lastName\.trim\(\)/)
  })
})

describe('a lost invite can be sent again', () => {
  const ADMIN = read('grounds/GroundAdminPage.tsx')

  /* The roster is People and setup's one list now (page audit, 24 November 2026, row 8): the button is on the row's own sentence,
     drawn by whereThisPersonIs in WhosInItRoster.tsx, and the call is still the page's. */
  const ROW = read('../components/gw/WhosInItRoster.tsx')
  it('the endpoint is called from the roster', () => {
    expect(ADMIN).toContain('groundsApi.resendParticipantInvite(id!, participantId)')
    expect(ROW).toContain('Resend invite')
  })

  it('offered only by the lead, and only while they have not joined', () => {
    /** The server refuses after acceptance; the button must not offer what the server will reject. */
    const gate = ROW.indexOf('} else if (!p.userId && isInitiator) {')
    const at = ROW.indexOf("'Resend invite'", gate)
    expect(gate).toBeGreaterThan(-1)
    expect(gate).toBeLessThan(at)
    expect(ROW.slice(gate + 1, at)).not.toContain('} else')
  })
})
