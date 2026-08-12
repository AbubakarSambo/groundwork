import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'

/**
 * A PAGE NOBODY CAN GET TO IS NOT A PAGE. W8-61.
 *
 * `every-destination-exists.spec.ts` checks the forward direction: everything the
 * app navigates to is a real route. This is the reverse, and it is the direction
 * the marketing site was broken in for months.
 *
 * There, four pages - about, pricing, how it works, use cases - were written,
 * deployed, and reachable by nobody, because the nav was buttons that revealed
 * thinner inline copies instead of links that went to them. Hafsah found it by
 * clicking About, reading to the bottom, and her own team not being there. No
 * test could have: both versions were real HTML, both looked finished.
 *
 * So: every route in `App.tsx` must either be linked from somewhere in the app,
 * or be listed below with the reason it is not. A route that is neither fails,
 * which makes "I built a page and forgot to link it" loud instead of silent.
 *
 * ADDING A ROUTE TO THE LIST IS A DECISION, NOT A FORMALITY. If the honest reason
 * is "nothing links to it yet", the fix is a link, not an entry here.
 */

/** Routes nothing links to on purpose, each with the thing that opens it. */
const REACHED_FROM_OUTSIDE_THE_APP: Record<string, string> = {
  '/verify-email': 'the link in the sign-up email',
  '/set-password': 'the link in the invite and add-a-password emails',
  '/reset-password': 'the link in the password-reset email',
  '/auth/google/callback': 'Google redirects here after sign-in',
  '/billing/callback': 'the payment provider redirects here',
  '/join': 'the broadcast link an admin copies off the ground page and sends',
  /**
   * `/demo/:persona` used to be exempted here as "pasted by hand when showing the
   * product". It is deleted, and so is the exemption. Five scripted conversations for a
   * fictional company, unlinked from anywhere, whose founder screen labelled named people
   * with pattern codes - CEO-Pleasing, Contributor Suppression, False Completion Reporting.
   * That is the read of a person as a type, which is the one thing the engine's own rules
   * forbid, kept alive as a sales asset. Her call: delete.
   */
  /**
   * `/profile/:id?` used to be exempted here, described as "the one real gap". It is
   * deleted: a page nobody could open, whose own copy said the feature was not built,
   * kept for callers that never existed. If a person's name becomes clickable, the page
   * comes back with the link that justifies it.
   */
}

const SRC_DIR = __dirname

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules') continue
    const full = join(dir, name)
    if (statSync(full).isDirectory()) sourceFiles(full, out)
    else if (/\.tsx?$/.test(name) && !name.includes('.spec.') && name !== 'App.tsx') out.push(full)
  }
  return out
}

const APP = readFileSync(join(SRC_DIR, 'App.tsx'), 'utf8')
const ROUTES = [...APP.matchAll(/<Route\s+path="([^"]+)"/g)].map(m => m[1])
const BLOB = sourceFiles(SRC_DIR).map(f => readFileSync(f, 'utf8')).join('\n')

/** Does anything in the app name this destination - navigate, Link, href? */
function isLinked(route: string): boolean {
  const base = route.split('/:')[0]
  return new RegExp(`["'\`]${base.replace(/[.*+?^$()|[\]\\]/g, '\\$&')}(["'\`/?])`).test(BLOB)
}

describe('every route can be reached', () => {
  it('App.tsx still has routes to check', () => {
    // A source-scanning rule that finds nothing asserts nothing.
    expect(ROUTES.length).toBeGreaterThan(20)
  })

  for (const route of ROUTES) {
    if (route === '*' || route === '/') continue
    it(`${route} is linked, or declared as opened from outside the app`, () => {
      const declared = route in REACHED_FROM_OUTSIDE_THE_APP
      const linked = isLinked(route)
      expect(
        linked || declared,
        `Nothing in the app links to "${route}". Either link it, or add it to ` +
          `REACHED_FROM_OUTSIDE_THE_APP with the thing that opens it. Do not add it ` +
          `because you forgot the link - that is exactly how /about went unreachable.`,
      ).toBe(true)
    })
  }

  it('and the list does not name routes that no longer exist', () => {
    // A stale exemption is how a route quietly stops being checked.
    for (const declared of Object.keys(REACHED_FROM_OUTSIDE_THE_APP)) {
      expect(ROUTES, `"${declared}" is exempted but is not a route any more`).toContain(declared)
    }
  })
})
