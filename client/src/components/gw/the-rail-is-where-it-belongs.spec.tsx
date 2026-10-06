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
    /**
     * This used to pin the whole expression, `isAuthenticated && !CHROMELESS.includes(...)`, and that
     * was too tight. It made a correct change fail: `/start` needs the rail WITHOUT being signed in,
     * because `AppSidebar` has a branch - commented "Entry ground shown when unauthenticated on
     * /start" - that draws the check-in somebody is building before they have an account. The auth
     * condition made that branch unreachable, so the rail Hafsah remembered on a signed-out window
     * was real and had quietly stopped being drawn.
     *
     * What this file is actually for is the chromeless list, so that is what it asserts now: the rail
     * is gated on the list, and the list is exact.
     */
    /** `[\s\S]` rather than `.` - the expression is multi-line since W-UX-8 added the back-office
     * prefix check beside the exact-path list. */
    expect(CODE).toMatch(/const showSidebar =[\s\S]*?!CHROMELESS\.includes\(location\.pathname\)/)
  })

  it('and the entry flow no longer gets the rail without an account', () => {
    /*
     * GROUP 3 REVIEW, BATCH B (1 October): REVERSED. start.jpg, the prototype's own signed-out
     * #/start, draws no sidebar at all - the `isEntryFlow` exception this test used to require
     * (`(isAuthenticated || isEntryFlow)`) put a rail there that the prototype never draws: an
     * "entry ground" with a navy "+ Start a check-in", a "Not saved yet" card and "Sign in" at the
     * foot, none of which start.jpg shows. `showSidebar` is `isAuthenticated` again, and a
     * signed-out /start keeps its own way to sign in on the page itself (EntryChatPage.tsx's
     * `Mark` + "Sign in" row), not in a rail that should not be there.
     */
    expect(CODE).toMatch(/const showSidebar =\s*isAuthenticated && !CHROMELESS\.includes/)
    expect(CODE).not.toMatch(/isAuthenticated \|\| isEntryFlow/)
  })

  it('every page reached from an email or the marketing site is on it', () => {
    for (const p of ['/auth', '/auth/sent', '/set-password', '/reset-password', '/verify-email', '/invite', '/join']) {
      expect(listed, `${p} draws its own whole screen and would double up`).toContain(p)
    }
  })

  it('and the app itself is not', () => {
    // The opposite mistake, and the worse one: this is what "side menu has vanished"
    // would actually look like if the list grew carelessly.
    // `/feed` is gone (W13-13), so it is no longer in this list - not because it became
    // chromeless, but because the page does not exist.
    for (const p of ['/', '/grounds', '/billing', '/team', '/admin']) {
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

/**
 * AND THE BACK OFFICE IS NOT A CUSTOMER PAGE. W-UX-8.
 *
 * `/admin` is our own operations console - every customer org, for us. It was rendering inside the
 * customer rail, so an internal page sat wrapped in a nav offering "Check-ins", "People" and
 * "Billing" for one particular organisation. Two products on one screen.
 */
describe('the platform back office stands alone', () => {
  it('is matched by prefix, so its sub-pages are covered too', () => {
    /** An exact-path list is what let `/admin/dashboard` through while `/admin` was handled. */
    /*
     * That '/admin' is IN the list, not that it is the whole list. The exact
     * literal was pinned, and adding the team's own back office at '/ops' broke
     * two specs that had nothing to say about it - a failure that teaches people
     * the spec is in the way rather than that something is wrong.
     */
    expect(CODE).toMatch(/CHROMELESS_PREFIXES = \[[^\]]*'\/admin'/)
    expect(CODE).toMatch(/location\.pathname\.startsWith\(`\$\{p\}\/`\)/)
  })

  it('and the rail is gated on it', () => {
    expect(CODE).toMatch(/const showSidebar =[\s\S]*?!isBackOffice/)
  })
})
