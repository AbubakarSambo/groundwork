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
  /* The anchor scenario's front door (docs/anchor-scenario-plan.md, piece 2). It is opened from the
     anchor link Hafsah shares outside the app, never from inside it, and it shows only while
     release.anchorScenario is on; otherwise it sends the visitor to /start. */
  '/start/team': 'the anchor link, shared outside the app',
  /*
   * THE REPORT REBUILD'S REVIEW PAGE, and it has no door on purpose.
   *
   * Every report surface for one check-in, on one page, so the rebuild can be judged against what
   * it replaces without navigating between four pages and losing the comparison. It is opened by
   * pasting its address, by the person doing the review, and it is temporary - it goes when the
   * last surface is ported.
   *
   * Nothing in the app links to it because nothing in the app should: it is a workbench rather than
   * a place, and a door to it would be a door nobody reading the product needs. It fetches nothing
   * of its own, so it adds no route to any data - every surface on it calls the endpoint it always
   * calls, with the reader's own token.
   */
  /* U.18: the old address of the Connect page. The API-access and failed-delivery emails, and the
     rollout checklist, still carry it; it opens "Connect your own tools", the page it always was. */
  '/org/integrations': 'the links in the API-access and failed-delivery emails',
  '/verify-email': 'the link in the sign-up email',
  '/set-password': 'the link in the invite and add-a-password emails',
  '/reset-password': 'the link in the password-reset email',
  '/auth/google/callback': 'Google redirects here after sign-in',
  '/billing/callback': 'the payment provider redirects here',
  /* The marketing pricing page's "Request a call" button. A different origin, so no scan of this
     codebase can see the door - and it is the way IN for somebody with no account, so nothing in
     the app should link to it. `every-route-has-a-door.spec.ts` checks the marketing side of it. */
  '/talk-to-us': 'the Request a call button on the marketing pricing page',
  /* The two links our own mail carries. Both are answered with no login on purpose: somebody who
     wants the mail to stop must not need an account to say so. See
     api/src/modules/email/a-link-on-a-mail-needs-a-page.spec.ts, which is the half of this that
     checks the mail really points here. */
  '/unsubscribe/:token': 'the unsubscribe link on every round digest',
  '/stop-reminders/:token': 'the stop-the-reminders link on an invitation and every reminder',
  '/preview/reports': 'pasted by whoever is checking the reports against the templates; goes when that is done',
  '/join': 'the broadcast link an admin copies off the check-in page and sends',
  '/join/confirm': 'the link emailed to the address somebody typed on /join — the only place the join flow creates anything',
  /**
   * The marketing site's header links here when its shared signed-in flag is set: a static page
   * cannot call a store, only follow a link. See client/src/lib/signed-in-flag.ts. Since U.2 every
   * Sign out inside the app lands here too, on "You're signed out", so it is also linked; the entry
   * stays because the marketing door is the one no scan of this codebase can see.
   */
  '/signout': 'the Sign out link in the marketing site header, when it sees the signed-in flag',
  /**
   * Groundwork's own prompt tools. Nothing in the app links to them and nothing should - they are
   * back-office, opened by staff typing the address. They used to live at /prompts and /prompts/test,
   * top-level addresses in a customer's app that rendered inside the customer's rail; under /admin
   * they are chromeless like the rest of the back office.
   *
   * WORTH KNOWING ABOUT THIS GUARD: the old pair never needed declaring, because `isLinked` found
   * the string '/prompts' in src/api/prompts.ts - an API path, not a link. So they passed as
   * "linked" on a coincidence, and only the move to /admin, which has no such twin, made this
   * check do its job. A route whose path happens to match an endpoint is invisible to it.
   */
  '/admin/prompts': 'typed by Groundwork staff; nothing in the app links to the back office',
  '/admin/prompts/test': 'typed by Groundwork staff; nothing in the app links to the back office',
  '/prompts': 'the old address, kept as a redirect for whoever bookmarked it',
  '/prompts/test': 'the old address, kept as a redirect for whoever bookmarked it',
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

const APP = readFileSync(join(SRC_DIR, 'App.tsx'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const ROUTES = [...APP.matchAll(/<Route\s+path="([^"]+)"/g)].map(m => m[1])
const BLOB = sourceFiles(SRC_DIR).map(f => readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')).join('\n')

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
