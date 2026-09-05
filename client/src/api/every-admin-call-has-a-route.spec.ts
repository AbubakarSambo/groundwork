import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * THE PAGE CALLED FOUR ROUTES AND THREE OF THEM DID NOT EXIST.
 *
 * `/admin/dashboard` on staging showed one line:
 *
 *   Unexpected token '<', "<!doctype "... is not valid JSON
 *
 * Two faults, and the outer one hid the inner. The page had its own
 * `fetch('/api' + path)` — one segment short of the `/api/v1` every other call
 * uses, and relative — so the request reached the site and came back as the
 * page's own HTML. Underneath: there was no `GET /admin/dashboard` at all,
 * disabling a code is a PATCH not a POST, and adding an admin is `add-admin`
 * not `admins`.
 *
 * `wired-endpoints.spec.ts` catches the opposite defect — an endpoint nothing
 * calls. This catches a call with no endpoint. Both are the same failure seen
 * from two sides: something is wired to nothing, and everything passes anyway.
 *
 * Scoped to the admin family, which is where it happened and where the paths are
 * plain string literals on both sides. A whole-codebase version would need to
 * resolve template paths and would be the kind of test people learn to skip.
 */

const apiFile = (...parts: string[]) =>
  readFileSync(join(__dirname, '..', '..', '..', 'api', 'src', 'modules', ...parts), 'utf8')

const CONTROLLER = apiFile('admin', 'admin.controller.ts')

/*
 * The door into the ops system answers on /admin/ops and lives in `ops/`, so
 * that no product module imports across the boundary. The page cannot tell the
 * difference and should not have to — so both controllers are read here.
 */
const OPS_DOOR = apiFile('ops', 'ops-door.controller.ts')

const stripComments = (t: string) =>
  t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

/** Every route the admin controller answers, as `METHOD /admin/path`. */
const routesIn = (source: string, base: string) =>
  [...stripComments(source).matchAll(/@(Get|Post|Patch|Delete|Put)\((?:'([^']*)')?\)/g)].map(
    ([, method, path]) => `${method.toUpperCase()} ${base}${path ? `/${path}` : ''}`,
  )

const routes = new Set([
  ...routesIn(CONTROLLER, '/admin'),
  ...routesIn(OPS_DOOR, '/admin/ops'),
])

/** What the dashboard page asks for, written the same way. */
const CALLS: string[] = [
  'GET /admin/dashboard',
  'POST /admin/otp/request',
  'PATCH /admin/codes/:codeId/disable',
  'POST /admin/add-admin',
  'GET /admin/admins',
  'POST /admin/admins/:userId/remove',
  'GET /admin/ops',
  'POST /admin/ops/setup',
  'POST /admin/ops/:personKey/account',
  'POST /admin/ops/:personKey/account/remove',
]

/** Path params are named on the server and not in the caller. Compare shapes. */
const shape = (route: string) => route.replace(/:[A-Za-z]+/g, ':x')
const shapes = new Set([...routes].map(shape))

describe('the admin controller', () => {
  it('was actually read, so an empty file cannot pass this', () => {
    expect(routes.size).toBeGreaterThan(15)
    expect(routes).toContain('GET /admin/pricing')
  })
})

describe('every call the dashboard makes', () => {
  it.each(CALLS)('%s is a route that exists', (call) => {
    expect(shapes).toContain(shape(call))
  })
})

describe('the page itself', () => {
  const PAGE = stripComments(
    readFileSync(join(__dirname, '..', 'pages', 'admin', 'AdminDashboardPage.tsx'), 'utf8'),
  )

  it('goes through the shared client, which carries the right base URL', () => {
    expect(PAGE).toContain("import { apiClient }")
  })

  it('has no hand-rolled fetch of its own', () => {
    /* THE ORIGINAL DEFECT. One page inventing its own transport is one page
       that does not get the base URL, the token, or the error handling. */
    expect(PAGE).not.toMatch(/fetch\(`\/api/)
    expect(PAGE).not.toMatch(/`\/api\$\{/)
  })

  it('and every path it names starts at /admin, not /api', () => {
    const paths = [...PAGE.matchAll(/apiClient\.\w+(?:<[^>]*>)?\(\s*[`'"]([^`'"]+)/g)].map((m) => m[1])
    expect(paths.length).toBeGreaterThan(5)
    for (const p of paths) expect(p).toMatch(/^\/admin/)
  })
})
