import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'

/**
 * A PAGE THE PRODUCT SENDS YOU TO AND WILL NOT LET YOU LEAVE.
 *
 * `/org/setup` had no rail, no header, no back and no sign out - and `RequireOrgSetup` redirects an
 * admin there from every signed-in route until it is filled in. So the only ways out of Groundwork
 * were the browser's own back button, which lands you straight back on it, or closing the tab.
 * Reported in one line: "this page doesnt have a back botton".
 *
 * AppShell's CHROMELESS list already promised this could not happen. Its comment says those pages
 * are "written as a standalone screen with its own header and its own way back" - which was true of
 * every entry on the list except the one that was added last. A comment is not a check.
 *
 * WHAT COUNTS AS A WAY OUT. Not a back button: every route sends the admin back here, so Back would
 * be a loop with a different label. Either a link off the app entirely (the marketing header every
 * other standalone screen has) or signing out. Both are here now; the test accepts either.
 */
const ROOT = join(__dirname, '../../..')
const SHELL = readFileSync(join(__dirname, 'AppShell.tsx'), 'utf8')

/** The list is read out of the component, so a page added to it is covered without editing this. */
function chromelessPaths(): string[] {
  const block = SHELL.slice(SHELL.indexOf('const CHROMELESS = ['))
  const arr = block.slice(0, block.indexOf(']'))
  return [...arr.matchAll(/'([^']+)'/g)].map(m => m[1])
}

/** Where a route's page component lives. Only the ones this repo actually has files for. */
const PAGE_FOR: Record<string, string> = {
  '/auth': 'pages/auth/AuthPage.tsx',
  '/org-new': 'pages/org/OrgNewPage.tsx',
  '/set-password': 'pages/auth/SetPasswordPage.tsx',
  '/reset-password': 'pages/auth/ResetPasswordPage.tsx',
  '/verify-email': 'pages/auth/MagicVerifyPage.tsx',
  '/google-failed': 'pages/auth/GoogleFailedPage.tsx',
}

describe('a page with no way out', () => {
  it('reads the real list, so this cannot pass by finding nothing', () => {
    const paths = chromelessPaths()
    expect(paths.length).toBeGreaterThan(5)
    expect(paths).toContain('/org-new')
  })

  it('gives every chromeless page a way out of it', () => {
    const stranded: string[] = []

    for (const path of chromelessPaths()) {
      const file = PAGE_FOR[path]
      if (!file) continue
      const full = join(ROOT, 'src', file)
      if (!existsSync(full)) continue

      const src = readFileSync(full, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '')

      /*
       * ANY WAY OFF THE PAGE COUNTS HERE, INCLUDING A ROUTE, and that is a deliberate loosening.
       * The first version of this demanded a link off the app or a sign out, and it immediately
       * caught `/verify-email` - which is wrong. That page's whole job is to send somebody INTO
       * the product, and its buttons do exactly that. Being moved on is not being stranded.
       *
       * The stricter rule belongs only to a page a guard HOLDS you on, where an in-app route
       * loops straight back. `/org/setup` is the one of those, and the next test asserts it.
       */
      /* The account screens are built from AuthCard and AuthSplit (pages/auth/auth-kit.tsx), whose
         Groundwork mark is the link to the marketing site. U.2. */
      const leavesTheApp = src.includes('MARKETING_URL') || /<Auth(Card|Split|Brand)\b/.test(src)
      const endsTheSession = /\blogout\s*\(/.test(src) || /navigate\('\/signout'/.test(src)
      const goesSomewhere = /navigate\(\s*['`]\//.test(src) || /<Link\b/.test(src)
      if (!leavesTheApp && !endsTheSession && !goesSomewhere) stranded.push(`${path} (${file})`)
    }

    expect(stranded, [
      'A chromeless page has no rail and no header from the shell, so whatever it draws is the whole',
      'screen. Without a link off the app or a sign out, somebody sent there is stuck in the product.',
      'Add the standalone header the other entries have, or a sign out, not a back button - a back',
      'button loops on any page a guard redirects to.',
    ].join('\n')).toEqual([])
  })

  it('"Create an organisation" has a way off it, though nothing holds anybody there', () => {
    /*
     * U.3: /org/setup is now an old address that goes to /org-new, "Create an organisation". No guard
     * sends anybody there any more (fix plan F6 took the redirect away, and U.3 made the billing email
     * optional), so the stricter rule for a page you are held on no longer applies. It still needs a
     * way off: the Groundwork mark on its card goes to the marketing site, and "Cancel" goes back.
     */
    const src = readFileSync(join(ROOT, 'src/pages/org/OrgNewPage.tsx'), 'utf8')
    expect(src).toMatch(/<AuthCard\b/)
    expect(src).toMatch(/>Cancel</)
    /* And nothing navigates during render. */
    expect(src).not.toMatch(/^\s*if \([^)]*\)\s*(?:return\s*)?<Navigate/m)
  })
})
