import { readdirSync, readFileSync, statSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'

/**
 * EVERY PLACE A BUTTON CAN SEND SOMEBODY MUST BE A REAL ROUTE.
 *
 * `BillingPage` navigated to `/billing/payment`. That route does not exist -
 * `PaymentPage` is mounted at `/billing/checkout` - so "Add sessions", the control
 * for buying sessions on a ground, landed a paying customer on "There is nothing at
 * this address", which tells them THEY typed something wrong.
 *
 * It was the only destination in the whole product that 404'd, and it was the one
 * that takes money. Nothing caught it because nothing checked, and a person only
 * meets it after deciding to pay.
 *
 * THE TRAP THIS RULE HAS TO AVOID, and my first version of this audit fell in it:
 * `<Route path="*">` is the 404 page, and it matches everything. Including the
 * catch-all made every destination look valid and the check reported zero problems
 * on a codebase that had one. The catch-all is excluded below, and the test at the
 * bottom proves the exclusion is still in force.
 */

const SRC = __dirname

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) {
      if (name === 'node_modules' || name === 'dist') continue
      walk(full, out)
    } else if (/\.tsx?$/.test(name) && !/\.spec\./.test(name)) {
      out.push(full)
    }
  }
  return out
}

const app = readFileSync(join(SRC, 'App.tsx'), 'utf8')

/** Routes as declared, minus the catch-all. */
const routes = [...app.matchAll(/<Route\s+path="([^"]+)"/g)]
  .map((m) => m[1])
  .filter((r) => r !== '*')

/**
 * `/profile/:id?` is an OPTIONAL param, so it matches both `/profile/abc` and
 * `/profile`. My first matcher turned every `:param` into a required segment and
 * reported `/profile` as a dead destination, which it is not. A rule that cries
 * wolf gets switched off, so the optional case is handled rather than exempted.
 */
/**
 * One route template as a matcher. Extracted so the optional-param behaviour can be
 * asserted directly - it used to be checked against `/profile/:id?`, the only route in
 * App.tsx with a `?`, which is now deleted. A property proved through whichever route
 * happens to have the shape today is a property that stops being proved.
 */
function routeMatcher(template: string): RegExp {
  const pattern = template
    .replace(/\/:[^/]+\?/g, '(?:/[^/]+)?')
    .replace(/:[^/]+/g, '[^/]+')
  return new RegExp('^' + pattern + '$')
}

const matchers = routes.map(routeMatcher)

/** A destination with its params and template holes removed. */
function normalise(target: string): string {
  const path = target.split('?')[0].replace(/\$\{[^}]+\}/g, 'x').replace(/\/+$/, '')
  return path || '/'
}

function destinationsIn(text: string): string[] {
  return [...text.matchAll(/navigate\(\s*[`'"](\/[^`'"]*)/g)].map((m) => m[1])
}

describe('every in-app destination resolves to a route', () => {
  it('found routes and destinations at all', () => {
    // A source-scanning rule that matches nothing passes silently. This is the
    // line that makes the rest of the file mean something.
    expect(routes.length).toBeGreaterThan(20)
    const all = walk(SRC).flatMap((f) => destinationsIn(readFileSync(f, 'utf8')))
    expect(all.length).toBeGreaterThan(20)
  })

  it('and none of them lands on the 404 page', () => {
    const dead: string[] = []
    for (const file of walk(SRC)) {
      for (const target of destinationsIn(readFileSync(file, 'utf8'))) {
        const path = normalise(target)
        if (!matchers.some((rx) => rx.test(path))) {
          dead.push(`${file.replace(SRC, 'src')} -> ${target}`)
        }
      }
    }
    expect({
      dead,
      whatToDo:
        'Each of these navigates somewhere App.tsx does not route, so it renders the 404 page. Fix the path or add the route. This is how the payment button broke.',
    }).toMatchObject({ dead: [] })
  })

  it('excludes the catch-all, or it would validate anything', () => {
    // THE BUG IN THE FIRST VERSION OF THIS CHECK. With '*' included, its regex is
    // ^.*$ and every string passes.
    expect(routes).not.toContain('*')
    expect(matchers.some((rx) => rx.test('/definitely-not-a-route'))).toBe(false)
  })

  it('would have caught the payment button', () => {
    // Reconstructed, since a rule that cannot fail is worse than no rule.
    expect(matchers.some((rx) => rx.test('/billing/payment'))).toBe(false)
    expect(matchers.some((rx) => rx.test('/billing/checkout'))).toBe(true)
  })

  it('and understands optional params, so it does not cry wolf', () => {
    /**
     * This used `/profile/:id?`, which was the only optional-param route in App.tsx and
     * is now deleted - a page nobody could open. The property being checked is the
     * matcher's handling of `?`, not that route, so it is checked directly rather than
     * against whichever route happens to have one today.
     */
    const optional = routeMatcher('/thing/:id?')
    expect(optional.test('/thing')).toBe(true)
    expect(optional.test('/thing/anything')).toBe(true)
  })
})
