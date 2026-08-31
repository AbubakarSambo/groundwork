import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'

/**
 * A PAGE NOTHING LINKS TO IS A PAGE THAT DOES NOT EXIST.
 *
 * The team board was a tab. It was taken out of the tab row for a good reason, written down in
 * `ground-tabs.ts`: it navigates away to a wide dark canvas rather than changing what sits under the
 * row. The same comment says it "is opened from the foot of Report now".
 *
 * That entry point was never built. The tab went, the route stayed live, nothing replaced it, and
 * the board became a fully working page in this product that nothing at all could reach. Every test
 * passed. Type-checking passed - the route is still valid, the component still compiles, the API it
 * calls is still served. The only way to find it was for somebody to go looking for the board and
 * say "the team board no longer exists".
 *
 * A comment describing where something MOVED TO is worth nothing until the link exists. So this
 * asks the only question that catches it: for every route the app serves, does anything navigate
 * there?
 */
const SRC = join(__dirname, '../..')

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (/\.tsx?$/.test(e) && !/\.spec\.tsx?$/.test(e)) out.push(p)
  }
  return out
}

const FILES = walk(SRC)
/** Comments stripped: a comment SAYING where a page is opened from is exactly the false comfort here. */
const ALL = FILES.filter(f => !f.endsWith('App.tsx'))
  .map(f => readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, ''))
  .join('\n')

/**
 * ONLY THE PLACES A PERSON CAN ACTUALLY BE SENT.
 *
 * My first version searched the whole source for the route's tail, and an import path satisfies it:
 * `@/api/board` contains "/board", so deleting the board's only link left the check green. A guard
 * that cannot be made to fail is not a guard - I removed the link I had just written and it passed.
 *
 * So this collects navigation, and nothing else: `navigate(...)`, `to=`, `href=`, `<Navigate to>`.
 */
const NAV_TARGETS = [
  ...ALL.matchAll(/navigate\(\s*[`'"]([^`'"]+)/g),
  ...ALL.matchAll(/\bto=\{?\s*[`'"]([^`'"]+)/g),
  ...ALL.matchAll(/\bhref=\{?\s*[`'"]([^`'"]+)/g),
  /** The nav rail keeps its destinations in a data structure: `{ to: '/settings', ... }`. */
  ...ALL.matchAll(/\bto:\s*[`'"]([^`'"]+)/g),
]
  .map((m) => m[1])
  .join('\n')

const APP = readFileSync(join(SRC, 'App.tsx'), 'utf8')

/**
 * Routes reached by something other than a link: entry points from email, deep links people paste,
 * redirects, and the auth flow. Each is genuinely doorless on purpose.
 */
const REACHED_FROM_OUTSIDE = [
  '/auth', '/login', '/signup', '/entry', '/verify', '/reset', '/forgot',
  '/invite', '/join', '/accept', '/set-password', '/magic', '/r/', '/admin',
  /**
   * Linked from the MARKETING SITE's header, not from the app - a static page cannot call the auth
   * store, so signing out needs a URL. Verified: marketing/src/components/Nav.astro links to it.
   */
  '/signout',
  /**
   * Stripe returns the browser here after checkout. The URL is built on the API
   * (`stripe.callbackUrl`), so nothing in this codebase navigates to it and nothing should.
   */
  '/billing/callback',
  /**
   * `RequireOrgSetup` and `RootRoute` redirect an admin with an incomplete org here - both live in
   * App.tsx, which this scan excludes on purpose (every route would trivially "link" to itself
   * otherwise). Nothing should link to it directly; arriving is the redirect's job, not a click's.
   */
  '/org/setup',
]

describe('every route the app serves has a way in', () => {
  const paths = [...APP.matchAll(/<Route\s+path="([^"]+)"/g)]
    .map(m => m[1])
    .filter(p => p !== '*' && p !== '/')

  it('finds the routes', () => {
    expect(paths.length).toBeGreaterThan(10)
  })

  it('and something navigates to each of them', () => {
    const orphans = paths.filter(p => {
      if (REACHED_FROM_OUTSIDE.some(prefix => p.startsWith(prefix))) return false
      // "/grounds/:id/board" -> the literal tail a template string would carry: "/board"
      const segments = p.split('/').filter(Boolean)
      const tail = segments[segments.length - 1]
      if (!tail || tail.startsWith(':')) return false
      return !new RegExp(`/${tail}\\b`).test(NAV_TARGETS)
    })
    expect(orphans).toEqual([])
  })
})
