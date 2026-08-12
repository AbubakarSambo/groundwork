import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'

/**
 * THE RAIL IS ON THE APP, AND NOT ON THE PAGES THAT ARE NOT THE APP. W8-68.
 *
 * Her words: "i can see the pages look a mess now, side menu has vanished etc."
 *
 * `showSidebar` was `isAuthenticated` and nothing else. So a signed-in person opening any
 * page somebody arrives at from OUTSIDE - a password link, an invite, a reset, the sign-in
 * page itself - got the app rail AND that page's own full-page chrome: a second dark
 * Groundwork header under the first, its own `minHeight: 100vh` pushing everything down, a
 * sign-in form beside a list of grounds. Two products in one window.
 *
 * Being signed in while opening one of these is normal, not an error: setting a password
 * on a second device, following an invite to another ground, switching account.
 *
 * The risk in this fix is the opposite mistake - taking the rail off a page that IS the
 * app - so the list is exact paths and the count is asserted. A prefix match would have
 * quietly eaten `/authorised-anything` later.
 */
const SRC = readFileSync(join(__dirname, 'AppShell.tsx'), 'utf8')
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

/** The list as the file declares it. */
const listed = (CODE.match(/const CHROMELESS = \[([\s\S]*?)\]/)?.[1] ?? '')
  .split(',')
  .map(s => s.trim().replace(/^'|'$/g, ''))
  .filter(Boolean)

describe('which pages stand alone', () => {
  it('the list exists and the rail is gated on it', () => {
    expect(CODE).toMatch(/const showSidebar = isAuthenticated && !CHROMELESS\.includes\(location\.pathname\)/)
  })

  it('every page reached from an email or the marketing site is on it', () => {
    for (const p of ['/auth', '/auth/sent', '/set-password', '/reset-password', '/verify-email', '/invite', '/join']) {
      expect(listed, `${p} draws its own whole screen and would double up`).toContain(p)
    }
  })

  it('and the app itself is not', () => {
    // The opposite mistake, and the worse one: this is what "side menu has vanished"
    // would actually look like if the list grew carelessly.
    for (const p of ['/', '/grounds', '/feed', '/billing', '/team', '/admin']) {
      expect(listed, `${p} is the app and must keep the rail`).not.toContain(p)
    }
  })

  it('it matches exact paths, not prefixes', () => {
    /**
     * `startsWith('/auth')` would also match a future `/authorised-...`, and the failure
     * would be a page silently losing its navigation - which is the exact complaint this
     * fix answers.
     */
    expect(CODE).toContain('CHROMELESS.includes(location.pathname)')
    expect(CODE).not.toMatch(/CHROMELESS\.some\([^)]*startsWith/)
  })
})
