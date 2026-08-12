import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'

/**
 * GW-AUTH-REDIRECT tripwire.
 *
 * Signing in used to navigate to "/home", which is not a route in App.tsx, so
 * EVERY user who signed in with a password landed on "There is nothing at this
 * address" - the first thing they saw after handing over their password. It was
 * invisible to every test because nothing drove the real form.
 *
 * This pins the rule generally: whatever a page navigates to after sign-in must
 * be a route that actually exists.
 */
const read = (p: string) => readFileSync(join(__dirname, p), 'utf8')

describe('GW-AUTH-REDIRECT: post-sign-in destination must exist', () => {
  const app = readFileSync(join(__dirname, '../../App.tsx'), 'utf8')
  const definedPaths = new Set(
    [...app.matchAll(/<Route\s+path="([^"]+)"/g)].map((m) => m[1]),
  )

  it('App.tsx defines the root route', () => {
    expect(definedPaths.has('/')).toBe(true)
  })

  it('AuthPage sends people somewhere that exists (tripwire)', () => {
    /**
     * WIDENED, because the destination stopped being a bare literal and this
     * spec went quietly to zero targets rather than red.
     *
     * `?next=` support turned `navigate('/')` into `navigate(nextPath ?? '/')`,
     * which the old pattern could not see - so it matched nothing, and a
     * tripwire that matches nothing asserts nothing. The `toBeGreaterThan(0)`
     * below is the only reason that surfaced at all, and it is why the line
     * exists: a source-scanning rule has to prove it still found something.
     */
    const src = read('AuthPage.tsx')
    const targets = [...src.matchAll(/navigate\(\s*(?:[a-zA-Z]+\s*\?\?\s*)?(?:'|")(\/[^'"]*)(?:'|")\s*\)/g)].map((m) => m[1])
    expect(targets.length).toBeGreaterThan(0)
    for (const t of targets) {
      const known = definedPaths.has(t) || [...definedPaths].some((p) => p !== '*' && t.startsWith(p.split('/:')[0]) && p.includes(':'))
      expect(known, `AuthPage navigates to "${t}" but App.tsx has no such route`).toBe(true)
    }
  })

  it('nothing navigates to /home any more', () => {
    expect(read('AuthPage.tsx')).not.toContain("'/home'")
  })

  it('and ?next= cannot be turned into an open redirect', () => {
    /**
     * `next` is read from the query string, so anybody can put anything in it.
     * Without the same-origin check, `/auth?next=https://evil.test` would hand a
     * freshly signed-in person to another site, and the link would look like
     * ours.
     */
    const src = read('AuthPage.tsx')
    expect(src).toMatch(/startsWith\('\/'\)/)
    expect(src).toMatch(/startsWith\('\/\/'\)/)
  })
})
