import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

/** Eight wrong destinations: a label naming the other button's console, a mailto to yourself, a sign-in that went to a protected route, a decline that bounced to the marketing site, a disabled primary that was scaffolding. */
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
const read = (rel: string) => strip(readFileSync(path.join(__dirname, rel), 'utf8'))

describe('destinations', () => {
  it('the console button is labelled for where it goes', () => {
    const dash = read('admin/AdminDashboardPage.tsx')
    expect(dash).toContain('Platform console →')
    expect(dash).not.toMatch(/>\s*Ops →\s*</)
  })
  it('no mailto is built from the reader\'s own address', () => {
    for (const rel of ['billing/BillingPage.tsx', 'billing/PricingPage.tsx']) expect(read(rel)).not.toMatch(/mailto:\$\{user\?\.email/)
    expect(read('billing/BillingPage.tsx')).toContain('mailto:hello@myground.work?subject=Enterprise plan enquiry')
  })
  it('"Sign in" goes to the sign-in page, not a protected route', () => {
    const invite = read('invite/InvitePage.tsx')
    expect(invite).not.toMatch(/onClick=\{\(\) => navigate\('\/grounds'\)\}>\s*Sign in to continue/)
    expect(invite).toMatch(/onClick=\{\(\) => navigate\('\/auth'\)\}>\s*Sign in to continue/)
  })
  it('declining settles on the page instead of bouncing to the marketing site', () => {
    const invite = read('invite/InvitePage.tsx')
    expect(invite).not.toMatch(/onClick=\{\(\) => navigate\('\/'\)\}/)
    expect(invite).toContain('Nothing has been shared and nobody is told.')
  })
  it('the lost-token exit lands on the link form, not the password form', () => {
    /* U.2 review: a link with no token opens "That link didn’t work", which carries the way to ask
       for a new link on the card itself, so there is no button to the password form at all. */
    const choose = read('auth/ChoosePasswordPage.tsx')
    expect(choose).not.toContain("navigate('/auth')")
    expect(choose).toContain('if (!token) return <LinkDidNotWork')
  })
  /* The label moved inside the clip's menu when the composer was rebuilt to the shape everybody
     knows; what this holds is the same thing, which is that it is not rendered at all with nothing
     to attach to. A label cannot be disabled: styled as disabled it still opens the picker. */
  it('the upload control is hidden rather than styled as disabled', () => {
    const chat = read('chat/ChatPage.tsx')
    /**
     * ROUND 5, ITEM B: the attach menu moved into Composer's own `plusMenu` slot
     * (components/gw/ui/Composer.tsx), which only renders it while `plusOpen` - the same
     * "hidden rather than disabled" rule, now split across two props: whether there is a
     * ground to attach to (`plusMenu={groundId ? (...) : undefined}`) and whether the menu is
     * currently open (`plusOpen={attachOpen}`).
     */
    expect(chat).toMatch(/plusMenu=\{groundId \? \(/)
    expect(chat).toMatch(/plusOpen=\{attachOpen\}/)
    expect(chat).toMatch(/<label htmlFor="doc-upload"/)
  })
  it('no permanently disabled primary control remains on the ending fold', () => {
    /*
     * REPOINTED (People and setup rebuild, 29 Sept): "Ending it" moved out of
     * GroundAdminPage.tsx's settings tab into CheckInPeopleAndSetup.tsx.
     *
     * WORDING UPDATED (U.4 review, item 8, 30 Sept): "archive" was the product's own word for
     * something the reader never asked for - they asked to END a check-in, and "Ending it" is what
     * the heading above the button already calls it. The button now says the same thing the
     * heading, and the rest of this section, say.
     */
    const admin = read('grounds/GroundAdminPage.tsx')
    const page = read('grounds/CheckInPeopleAndSetup.tsx')
    expect(admin).not.toMatch(/<button disabled[^>]*>\s*Close this check-in/)
    expect(page).not.toMatch(/<button disabled[^>]*>\s*Close this check-in/)
    expect(page).toContain('Ask us to end this check-in')
  })
  it('the destination a visitor arrived with is kept for the magic link', () => {
    expect(read('auth/AuthPage.tsx')).toMatch(/sessionStorage\.setItem\('gw_next', nextPath\)/)
    expect(read('auth/ChoosePasswordPage.tsx')).toMatch(/sessionStorage\.getItem\('gw_next'\)/)
  })
})
