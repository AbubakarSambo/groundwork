import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

/**
 * TWENTY-THREE ROUTES WERE BUILT AND REACHABLE FROM NO SCREEN.
 *
 * Creating an objective. Adding the key result that says whether it happened.
 * Asking for something you cannot deliver without. Recording money in — so the
 * balance was made entirely of spend and read "$-420 left", a number that looks
 * like a fact and is an absence. Moving an introduction along, which is the
 * status the qualifying line measures. Changing any of the decisions the whole
 * system runs on.
 *
 * None of it was broken. It was finished work nobody could reach, which is
 * harder to notice than a bug: everything passes, and the value never arrives.
 * The product has had `wired-endpoints.spec.ts` for exactly this since the
 * eighteen-ground run. The ops system had never been checked.
 *
 * Two directions, because they fail differently:
 *   a route with no caller  — built and unreachable
 *   a caller with no route  — a button that always errors
 */

const REPO = join(__dirname, '..', '..', '..')
const OPS_CONTROLLERS = join(REPO, 'api', 'src', 'modules', 'ops')
const CLIENT_SRC = join(__dirname, '..')

const stripComments = (t: string) =>
  t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

/** Every route the ops controllers answer, as `METHOD /path`. */
function everyRoute(): string[] {
  const out: string[] = []
  for (const file of readdirSync(OPS_CONTROLLERS).filter((f) => f.endsWith('.controller.ts'))) {
    const source = stripComments(readFileSync(join(OPS_CONTROLLERS, file), 'utf8'))
    const base = source.match(/@Controller\('([^']*)'\)/)?.[1] ?? ''
    for (const m of source.matchAll(/@(Get|Post|Patch|Delete|Put)\((?:'([^']*)')?\)/g)) {
      const path = m[2] ?? ''
      out.push(`${m[1].toUpperCase()} /${base}${path ? `/${path}` : ''}`)
    }
  }
  return out
}

/** Every `/ops` path written anywhere in the client. */
function everyPathTheClientNames(): Set<string> {
  const found = new Set<string>()
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const p = join(dir, entry)
      if (statSync(p).isDirectory()) walk(p)
      else if (/\.tsx?$/.test(entry) && !entry.includes('.spec.')) {
        const source = stripComments(readFileSync(p, 'utf8'))
        for (const m of source.matchAll(/[`'"](\/(?:ops|admin\/ops)[^`'"]*)/g)) found.add(m[1])
      }
    }
  }
  walk(CLIENT_SRC)
  return found
}

/** Path params are named on the server and interpolated in the client. Compare shapes. */
const shape = (path: string) =>
  path
    .replace(/\$\{[^}]+\}/g, ':x')
    .replace(/:[A-Za-z]+/g, ':x')
    .replace(/\/$/, '')

/**
 * The one route with no caller, and why.
 *
 * Every number in this system already ships with the rows that made it —
 * boards do, and so does a key result. A second way to fetch the same evidence
 * would give two answers to one question and eventually two different answers.
 * The route stays for anything reading this system from outside.
 */
const NOT_WIRED_ON_PURPOSE = [
  'GET /ops/metrics/:key',
  /* A SERVER CALLS THIS ONE, NOT A PERSON.
     Groundwork posts a signed delivery here when a round finishes. There is no screen because there
     is nobody at the other end — what ARRIVES is shown, in the assistant panel, which is the read
     this guard should be protecting. */
  'POST /ops/groundwork/events',
]

describe('the ops routes', () => {
  const routes = everyRoute()

  it('were found, so an empty read cannot pass this', () => {
    expect(routes.length).toBeGreaterThan(80)
    expect(routes).toContain('GET /ops/me')
  })

  it('are every one of them reachable from a screen', () => {
    const named = new Set([...everyPathTheClientNames()].map(shape))
    const unreachable = routes
      .filter((r) => !named.has(shape(r.split(' ')[1])))
      .filter((r) => !NOT_WIRED_ON_PURPOSE.includes(r))
    expect(unreachable).toEqual([])
  })

  it('and the exemptions are still real routes, not stale names', () => {
    /* An exemption for a route that no longer exists is a comment claiming to
       be a decision. */
    for (const exempt of NOT_WIRED_ON_PURPOSE) expect(routes).toContain(exempt)
  })
})

describe('the ops client', () => {
  const api = stripComments(readFileSync(join(__dirname, 'ops.ts'), 'utf8'))
  const body = api.slice(api.indexOf('export const opsApi'))
  const functions = [...body.matchAll(/^ {2}([a-zA-Z][A-Za-z0-9]*):/gm)].map((m) => m[1])

  it('has functions to check', () => {
    expect(functions.length).toBeGreaterThan(80)
  })

  it('has none that no screen calls', () => {
    const screens: string[] = []
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const p = join(dir, entry)
        if (statSync(p).isDirectory()) walk(p)
        else if (/\.tsx?$/.test(entry) && !entry.includes('.spec.') && entry !== 'ops.ts') {
          screens.push(readFileSync(p, 'utf8'))
        }
      }
    }
    walk(CLIENT_SRC)
    const all = screens.join('\n')
    const orphaned = functions.filter((f) => !new RegExp(`opsApi\\.${f}\\b`).test(all))
    expect(orphaned).toEqual([])
  })

  it('names no path the API does not answer', () => {
    /*
     * The other direction: a button that always errors. This is what broke the
     * admin dashboard — three of its four routes did not exist.
     *
     * Only paths inside an `apiClient` call. The client also writes `/ops/...`
     * as react-router page paths and as hrefs, and those are not requests — an
     * earlier version of this check counted them and demanded the API answer
     * `/ops/target-companies`.
     */
    const routeShapes = new Set(everyRoute().map((r) => shape(r.split(' ')[1])))
    const requested = [...api.matchAll(/apiClient\.\w+[\s\S]{0,500}?[`'"](\/(?:ops|admin\/ops)[^`'"]*)/g)].map(
      (m) => m[1],
    )
    expect(requested.length).toBeGreaterThan(80)
    const dangling = [...new Set(requested)].filter((p) => !routeShapes.has(shape(p)))
    expect(dangling).toEqual([])
  })
})
