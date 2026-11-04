import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'

const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const APP = strip(readFileSync(join(__dirname, '..', '..', 'App.tsx'), 'utf8'))

/**
 * THE BENCH IS OURS, AND IT WAS OPEN TO EVERY CUSTOMER.
 *
 * `/preview/reports` puts all eight report surfaces side by side on one check-in. It is how a
 * surface gets judged against the template, and it carries our own working notes - including, for
 * months, one saying a surface had not been rebuilt yet.
 *
 * It sat behind `RequireOrgSetup`, which is any signed-in person with a workspace. Anybody who
 * guessed the address read our unfinished work in our own words. Asked directly: "who can see it,
 * will it be just me - it needs to be hidden from the client."
 *
 * It belongs where the rest of the platform back office is, behind isPlatformAdmin.
 */
describe('the report bench is ours, not a customer\'s', () => {
  it('is behind the platform gate, not the customer one', () => {
    const at = APP.indexOf('path="/preview/reports"')
    expect(at).toBeGreaterThan(-1)
    /* This route's own line and no further: a fixed window ran into the next route and read its
       guard instead, which is how a passing test tells you about the wrong line. */
    const route = APP.slice(at, APP.indexOf('\n', at))
    expect(route).toContain('RequirePlatformAdmin')
    expect(route).not.toContain('RequireOrgSetup')
  })

  it('and nothing in the product links to it', () => {
    /*
     * A gate plus a link is a gate somebody trips over: a customer following a link into a refusal
     * reads it as the product being broken. The only way here is typing the address.
     *
     * B-048 added '/preview' to AppShell's own CHROMELESS_PREFIXES, so the identical staff-only
     * refusal renders the same way (no customer sidebar) on `/preview/reports` as it already does
     * on every `/admin/*` page - that line names the address to withhold the rail from, which is
     * the opposite of linking to it. The check below still proves nobody can click their way here:
     * no navigation item's `to`/`href` names it.
     */
    const NAV = strip(readFileSync(join(__dirname, '..', '..', 'components', 'gw', 'AppShell.tsx'), 'utf8'))
    expect(NAV).not.toMatch(/(?:to|href)=(?:"|\{`)\/preview/)
  })
})
