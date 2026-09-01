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
    for (const f of ['billing/BillingPage.tsx', 'notfound/NotFoundPage.tsx']) {
      const src = strip(readFileSync(join(PAGES, f), 'utf8'))
      expect(src, f).toMatch(/<h1[\s>]/)
    }
  })

  it('and neither has gone back to a 22px div standing in for one', () => {
    for (const f of ['billing/BillingPage.tsx', 'notfound/NotFoundPage.tsx']) {
      const src = strip(readFileSync(join(PAGES, f), 'utf8'))
      /* the exact shape both used: a div carrying heading-sized weight and nothing else */
      expect(src, f).not.toMatch(/<div style=\{\{ fontSize: 22, fontWeight: [78]00/)
    }
  })
})
