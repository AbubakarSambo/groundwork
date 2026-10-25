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

function walkAstro(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e)
    if (statSync(p).isDirectory()) walkAstro(p, out)
    else if (/\.astro$/.test(e)) out.push(p)
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
  '/release-4-preview', // Release 4: hand-written boards, in development builds only (App.tsx), never offered on the product
  /* The page that shows every report surface at once. No door on purpose: it is a workbench, opened
     by pasting its address, and it goes once the surfaces have been checked against the templates.
     It was deleted once on the grounds that every surface had a home, which was the wrong test. */
  '/preview/reports',
  '/auth', '/login', '/signup', '/entry', '/verify', '/reset', '/forgot',
  '/invite', '/join', '/accept', '/set-password', '/magic', '/r/', '/admin',
  /**
   * THE QR CODE'S OWN DOOR. It is reached by pointing a phone camera at a code on a wall, a slide
   * or a printout - the lead shares the link, and the app itself never navigates to it. The ground
   * page builds the address (`/answer?t=`) and shows it with a QR beside it, which is the door.
   */
  '/answer',
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
   * An old address, kept because links to it are out there: it goes to /org-new ("Create an
   * organisation", U.3), which the organisation menu links to. Nothing should link to the old one.
   */
  '/org/setup',
  /**
   * The old address of the Connect page (U.18). The links in the API-access and failed-delivery
   * emails still carry it, and those emails must keep working exactly as now; it opens
   * /settings/tools, "Connect your own tools", the page it always was. Nothing should link to it.
   */
  '/org/integrations',
  /**
   * The Groundwork team's own back office. Reached by typing the address, like
   * the prompt tools under /admin, and deliberately not linked from the product:
   * a customer's navigation must never carry a way into our company's operating
   * system, even one that would 403.
   *
   * Declared here rather than left to satisfy the scan by accident. /ops and
   * /ops/target-companies link to EACH OTHER, which is enough for the check below and
   * proves nothing about either having a door - a circle is not an entrance.
   */
  '/ops',
  /**
   * The Request-a-call form. Its door is the "Request a call" button on the marketing pricing page,
   * which is a different origin and cannot be seen by a scan of this codebase. Nothing in the app
   * links to it on purpose: it is the way IN for somebody who has not signed up.
   *
   * Declared here, and then actually checked below - this file's own opening says a comment
   * describing where something is reached from "is worth nothing until the link exists", and the
   * `/signout` entry above had been resting on precisely that kind of claim.
   */
  '/talk-to-us',
  /**
   * THE ANCHOR SCENARIO'S OWN FRONT DOOR (plan piece 2, docs/anchor-scenario-plan.md section 5).
   * Reached the same way as "/answer": a link shared on WhatsApp, LinkedIn or email, not a link
   * from inside this app. The app does not navigate to it on purpose - a signed-in person already
   * has /start - and the page itself redirects there whenever the engine's switch is not on, which
   * is its only state today (request 144, docs/requests-to-engine.md).
   */
  '/start/team',
]

/**
 * THE DOORS THAT ARE ON THE OTHER SITE, CHECKED RATHER THAN ASSERTED IN PROSE.
 *
 * Two routes above say a marketing page links to them. Marketing is a separate build in the same
 * repository, so that claim is checkable, and an unchecked claim is the thing this file exists to
 * catch. If somebody rewrites the pricing page and drops the button, the route becomes unreachable
 * from anywhere and this is what says so.
 */
const MARKETING = join(__dirname, '../../../../marketing/src')
const MARKETING_SRC = (() => {
  try {
    return walk(MARKETING).concat(walkAstro(MARKETING)).map(f => readFileSync(f, 'utf8')).join('\n')
  } catch {
    return ''
  }
})()

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

  it('and the two doors that live on the marketing site are really there', () => {
    /* Skipped rather than failed if marketing is not checked out beside the client - the point is
       to catch a door being REMOVED, not to require a sibling directory to run the suite. */
    if (!MARKETING_SRC) return
    expect(MARKETING_SRC).toMatch(/\/talk-to-us/)
    expect(MARKETING_SRC).toMatch(/\/signout/)
  })
})
