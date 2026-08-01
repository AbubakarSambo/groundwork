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
    const src = read('AuthPage.tsx')
    const targets = [...src.matchAll(/navigate\((?:'|")(\/[^'"]*)(?:'|")\)/g)].map((m) => m[1])
    expect(targets.length).toBeGreaterThan(0)
    for (const t of targets) {
      const known = definedPaths.has(t) || [...definedPaths].some((p) => p !== '*' && t.startsWith(p.split('/:')[0]) && p.includes(':'))
      expect(known, `AuthPage navigates to "${t}" but App.tsx has no such route`).toBe(true)
    }
  })

  it('nothing navigates to /home any more', () => {
    expect(read('AuthPage.tsx')).not.toContain("'/home'")
  })
})
