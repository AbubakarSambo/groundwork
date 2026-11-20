import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'

/**
 * A PAGE THAT IS NOT MEASURED CAN DRIFT (docs/spacing-audit-15-nov.md, section 5).
 *
 * Every route in App.tsx must be in the list the spacing measure walks (e2e/spacing-routes.ts), or be
 * listed here with the reason it is not. Adding a page without adding it to one of the two fails
 * this, the same trick as every-page-can-be-reached.spec.ts.
 */
const app = readFileSync(join(__dirname, 'App.tsx'), 'utf8')
const measured = readFileSync(join(__dirname, '..', '..', 'e2e', 'spacing-routes.ts'), 'utf8')

/** Back office, platform admin, developer previews, and routes that only send the visitor elsewhere. */
const NOT_MEASURED_PREFIXES: Record<string, string> = {
  '/ops': 'the team\'s own back office, not met by customers and not built from these parts',
  '/admin': 'the platform console, not met by customers',
  '/prompts': 'redirects to the platform console\'s prompt pages',
  '/preview': 'a platform administrator\'s review page',
  '/release-4-preview': 'a developer preview, only in a development build',
  '/scenario-boards': 'a developer preview, only in a development build',
  '/dev': 'a developer preview, only in a development build',
}
const NOT_MEASURED_EXACT: Record<string, string> = {
  '/': 'sends the visitor to the page they belong on',
  '/login': 'redirects to /auth',
  '/auth/google/callback': 'Google sends the visitor here and the page only says it is signing them in',
  '/signout': 'a sign-out that shows nothing',
  '/start/team': 'redirects to /start',
  '/org/setup': 'redirects to /org-new',
  '/grounds/new': 'redirects to /start',
  '/check-in/:checkInId': 'redirects to /checkin/:checkInId',
  '/chat/:checkInId': 'redirects to /checkin/:checkInId',
  '/settings/billing': 'the same page as /billing',
  '/org/integrations': 'redirects to /settings/tools',
  '/*': 'the not-found page',
  '*': 'the not-found page',
}

describe('every page is measured for spacing', () => {
  it('lists every route the product serves to customers in the spacing measure', () => {
    const paths = [...app.matchAll(/<Route\s+path="([^"]+)"/g)].map((m) => m[1])
    expect(paths.length).toBeGreaterThan(40)
    const missing = paths.filter((p) => {
      if (NOT_MEASURED_EXACT[p]) return false
      if (Object.keys(NOT_MEASURED_PREFIXES).some((x) => p === x || p.startsWith(x + '/'))) return false
      return !measured.includes(`path: '${p}'`)
    })
    expect(missing, 'Add the page to e2e/spacing-routes.ts, or say here why it is not measured').toEqual([])
  })

  it('does not list a route that no longer exists', () => {
    const paths = new Set([...app.matchAll(/<Route\s+path="([^"]+)"/g)].map((m) => m[1]))
    const listed = [...measured.matchAll(/\{ path: '([^']+)'/g)].map((m) => m[1])
    expect(listed.filter((p) => !paths.has(p))).toEqual([])
  })
})
