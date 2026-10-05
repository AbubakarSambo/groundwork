import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

/**
 * A PAGE WITH NO HEADING IS A PAGE A SCREEN READER CANNOT ENTER.
 *
 * Measured in the running product, /billing and the not-found page each rendered their title as a
 * `div` at 22px: visually a heading, structurally nothing. Someone navigating by headings - which is
 * how most screen reader users move around a page - lands on those two and finds an empty document.
 *
 * The sibling pages already did it right (`<h1 className="gw-logo gw-page-h1">Check-ins</h1>`), so
 * this was two stragglers rather than a missing convention.
 *
 * WHY THE BROWSER MISSED IT FOR MOST OF A DAY. Every sweep I ran used `/connect`, and `/connect` is
 * a 404 - the route is `/org/integrations`. So the sweeps kept measuring the not-found page and
 * reporting it clean, while neither the real Connect page nor /billing was ever looked at. A route
 * that does not exist does not fail a sweep; it quietly answers for whatever page you meant.
 */
const PAGES = join(__dirname)

function tsxUnder(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...tsxUnder(full))
    else if (entry.endsWith('Page.tsx')) out.push(full)
  }
  return out
}

const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')

describe('every page says what it is', () => {
  it('finds the page components, so an empty list cannot pass', () => {
    expect(tsxUnder(PAGES).length).toBeGreaterThan(6)
  })

  it('the two that rendered a div as their title now render a heading', () => {
    /*
     * UPDATED, GROUP 1 REBUILD: BillingPage.tsx no longer writes `<h1` itself - it is rebuilt from
     * components/gw/ui, and its heading is `PageTitle`, whose own `<h1 className="gwui-pt-title">`
     * (PageTitle.tsx) is the real heading a screen reader lands on. This still checks the original
     * guarantee (a real `<h1>`, not a div standing in for one) in the vocabulary the page now uses.
     */
    const billing = strip(readFileSync(join(PAGES, 'billing/BillingPage.tsx'), 'utf8'))
    expect(billing).toMatch(/<PageTitle[\s\S]{0,80}title="Plan and billing"/)
    /*
     * U.20: NotFoundPage is rebuilt from the shared parts too, so its heading is now `PageTitle`'s
     * own `<h1>` rather than one the page wrote itself - checked the same way billing's is, just
     * above, instead of a bare `<h1[\s>]` the page no longer writes directly.
     */
    const notFound = strip(readFileSync(join(PAGES, 'notfound/NotFoundPage.tsx'), 'utf8'))
    expect(notFound).toMatch(/<PageTitle[\s\S]{0,80}title="Nothing is at this address"/)
  })

  it('the check-in list names its section with a heading, not a div that looks like one', () => {
    /*
     * "Setting up Local Test Co" was a 16px/700 div sitting under the page's h1. Swept across six
     * pages in the running product it was the last one left, so the outline now reads
     * H1 Check-ins -> H2 Setting up Local Test Co rather than stopping at the h1.
     */
    const firstRun = readFileSync(join(PAGES, 'grounds/an-admin-lands-on-a-check-in-list.tsx'), 'utf8')
    /* U.3: the section is now the prototype's "Get <organisation> going", still an h2. */
    expect(firstRun).toMatch(/<h2>Get \{orgName\} going<\/h2>/)
  })

  it('and neither has gone back to a 22px div standing in for one', () => {
    for (const f of ['billing/BillingPage.tsx', 'notfound/NotFoundPage.tsx']) {
      const src = strip(readFileSync(join(PAGES, f), 'utf8'))
      /* the exact shape both used: a div carrying heading-sized weight and nothing else */
      expect(src, f).not.toMatch(/<div style=\{\{ fontSize: 22, fontWeight: [78]00/)
    }
  })
})
