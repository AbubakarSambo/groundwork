import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'

/**
 * THE LOGO GOES HOME, AND SIGNING OUT IS POSSIBLE FROM ANYWHERE.
 *
 * Her rules: "the groundwork logo and icon are meant to always take you back to the marketing page.
 * If you are signed-in it can show sign-out so you can stay signed-in on the same device for a while
 * without having to sign-in again."
 *
 * WHAT WAS ACTUALLY WRONG.
 *
 * The mark. `GroundworkLogo` was a bare `<svg>`, so on `Arrival` - the invite, the join, the sign-in
 * link, the first Groundwork screen a stranger ever sees - the logo did nothing when clicked. The
 * rail's wordmark did link out, but only when expanded: collapsed, there was no mark at all, in the
 * state somebody works in all day.
 *
 * The URL. Four files each declared `VITE_MARKETING_URL ?? 'https://myground.work'`, and two more had
 * the production URL typed in with no env var - so on a staging build the rail's logo went to staging
 * and the entry chat's went to production.
 *
 * Signing out. It existed on `GroundsListPage` and nowhere else, as a `<span>` with an onClick. From a
 * ground, a check-in, billing or settings there was no way to leave except navigating back to the list
 * to find it.
 *
 * The session itself is seven days and persisted, which is the other half of what she asked for:
 * staying signed in already worked, and leaving on purpose is what did not.
 */
const SRC = join(__dirname, '../..')
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const read = (p: string) => strip(readFileSync(join(SRC, p), 'utf8'))

describe('the mark is the way home', () => {
  it('the logo component links to the marketing site by default', () => {
    const logo = read('components/gw/GroundworkLogo.tsx')
    expect(logo).toMatch(/linkToMarketing = true/)
    expect(logo).toMatch(/<a href=\{MARKETING_URL\}/)
  })

  it('so the first screen a stranger sees has a way back to the site', () => {
    // `Arrival` is the invite, the join and the sign-in link. It renders the mark with no props, so
    // it gets the link from the default rather than having to remember.
    expect(read('components/gw/Arrival.tsx')).toMatch(/<GroundworkLogo \/>/)
  })

  it('and the rail has a mark in both states', () => {
    /**
     * Collapsed, there used to be nothing but the chevron. That is the state the rail spends most of
     * its life in on a narrow window.
     */
    const shell = read('components/gw/AppShell.tsx')
    expect(shell).toMatch(/\{!collapsed \? \(/)
    expect((shell.match(/href=\{MARKETING_URL\}/g) ?? []).length).toBeGreaterThanOrEqual(2)
  })
})

describe('one declaration of where the site is', () => {
  it('the constant exists', () => {
    expect(read('lib/marketing.ts')).toMatch(/export const MARKETING_URL/)
  })

  it('and falls back on an EMPTY value, not only on a missing one', () => {
    /**
     * THE BUG THAT MADE ALL OF THIS INVISIBLE. `client/.env` has `VITE_MARKETING_URL=` with nothing
     * after it - the empty string, not undefined - so `??` never fell back and every logo rendered
     * `href=""`, a link to the page you are already on. It looks exactly like a working link.
     *
     * Caught by reading the attribute off the running page rather than trusting the expression.
     */
    const src = read('lib/marketing.ts')
    expect(src).toMatch(/VITE_MARKETING_URL \|\| 'https:\/\/myground\.work'/)
    expect(src).not.toMatch(/VITE_MARKETING_URL \?\?/)
  })

  it('and nothing else declares it, or hardcodes the production URL', () => {
    /**
     * THE PART THAT WOULD BITE ON STAGING. Two pages had `https://myground.work` typed straight in,
     * so half the logos in a staging build pointed at the live site.
     */
    const files: string[] = []
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const p = join(dir, name)
        if (statSync(p).isDirectory()) walk(p)
        else if (/\.tsx?$/.test(name) && !name.includes('.spec.')) files.push(p)
      }
    }
    walk(SRC)
    const offenders: string[] = []
    for (const f of files) {
      if (f.endsWith('lib/marketing.ts')) continue
      /**
       * `App.tsx` reads the raw variable on purpose: it bounces a signed-out visitor to the
       * marketing site ONLY when one is explicitly configured, so a local dev with no env file stays
       * in the app instead of being sent to production. The shared constant defaults to production,
       * which is right for a link and wrong for that redirect.
       */
      if (f.endsWith('App.tsx')) continue
      const code = strip(readFileSync(f, 'utf8'))
      if (/VITE_MARKETING_URL/.test(code)) offenders.push(`${f.replace(SRC, '')} declares it again`)
      // `support@myground.work` is an address, not a destination.
      if (/href="https:\/\/myground\.work/.test(code)) offenders.push(`${f.replace(SRC, '')} hardcodes it`)
    }
    expect(offenders).toEqual([])
  })
})

describe('signing out', () => {
  it('is in the rail, so it is on every page', () => {
    const shell = read('components/gw/AppShell.tsx')
    expect(shell).toMatch(/Sign out/)
    expect(shell).toMatch(/onClick=\{\(\) => \{ logout\(\); navigate\('\/'\) \}\}/)
  })

  it('and it is a button, not a span with a click handler', () => {
    const shell = read('components/gw/AppShell.tsx')
    const i = shell.indexOf('Sign out')
    expect(shell.slice(i - 700, i)).toMatch(/<button/)
  })

  it('and says what it does, since the session otherwise lasts', () => {
    // Seven days, persisted. Leaving is a choice, so the control should say it is about this device.
    expect(read('components/gw/AppShell.tsx')).toMatch(/Sign out of Groundwork on this device/)
  })
})

describe('and you stay signed in on the device', () => {
  /**
   * THE ACTUAL CAUSE of having to sign in again, and it was not the token. `useSessionTimeout` signed
   * people out after 30 minutes with no mouse or keyboard, warning at 29. The JWT lasts seven days and
   * the auth store persists it, so the server still trusted you - the browser was throwing you out.
   *
   * Step away from a check-in to go and find the document it just asked you for, come back, sign in
   * again. On the product whose whole job is somebody writing carefully about their work.
   */
  /** Raw, not stripped: what this file mostly IS is the note explaining the decision. */
  const TIMEOUT_RAW = readFileSync(join(SRC, 'lib/useSessionTimeout.ts'), 'utf8')
  const TIMEOUT = read('lib/useSessionTimeout.ts')

  it('nothing signs you out for being idle', () => {
    expect(TIMEOUT).not.toMatch(/setTimeout/)
    expect(TIMEOUT).not.toMatch(/logout\(\)/)
    expect(TIMEOUT).not.toMatch(/Signed out due to inactivity/)
  })

  it('and the hook still exists, so the decision has one home', () => {
    // Deleted, it would be re-added by whoever next wants an idle timer, without the note.
    expect(TIMEOUT).toMatch(/export function useSessionTimeout/)
  })

  it('the trade is written down rather than assumed', () => {
    /**
     * An unattended session now stays open until the token expires or somebody signs out. That is a
     * real exposure on a shared machine and it is why the timer existed. The file says so, and says
     * where the control belongs if it comes back: a shorter token with a refresh, on the server,
     * rather than a browser timer that fires while the API still trusts you.
     */
    expect(TIMEOUT_RAW).toMatch(/shared machine/)
    expect(TIMEOUT_RAW).toMatch(/not as a browser timer/)
  })
})
