import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * WHERE THE EARLIER ROUNDS LIVE.
 *
 * Under the report, not on a page of their own. They are the same report at earlier moments, so
 * somebody looking for them is already on that tab - and below the current picture, because you
 * read what is true now first and the earlier ones are context for it.
 */
const PANEL = readFileSync(join(__dirname, 'HowThisHasMoved.tsx'), 'utf8')
const PAGE = readFileSync(join(__dirname, '..', '..', 'pages', 'grounds', 'GroundAdminPage.tsx'), 'utf8')
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')

describe('where it sits', () => {
  it('inside the report tab, and nowhere else', () => {
    const code = strip(PAGE)
    const report = code.indexOf("tab === 'report'")
    const settings = code.indexOf("tab === 'settings'")
    const panel = code.indexOf('<HowThisHasMoved')
    expect(panel).toBeGreaterThan(report)
    expect(panel).toBeLessThan(settings)
  })

  it('and no route of its own was added for it', () => {
    /* "I do not want any new pages." */
    /*
     * The first version of this matched `/grounds`, because "grounds" ends in "rounds". It passed
     * against a route that does not exist and would have failed against the route list as it
     * stands. Checking the import is the honest test: a page needs a route AND a component, and
     * this component is only ever rendered inside the report tab.
     */
    const app = readFileSync(join(__dirname, '..', '..', 'App.tsx'), 'utf8')
    expect(app).not.toContain('HowThisHasMoved')
  })
})

describe('what it shows', () => {
  const code = strip(PANEL)

  it('nothing at all until a round has closed', () => {
    expect(code).toContain('if (!moved.length) return null')
  })

  it('what each round led with, and when', () => {
    expect(code).toContain('{m.says}')
    expect(code).toContain('{m.takenAt}')
  })

  it('says nothing has been rewritten since', () => {
    expect(PANEL).toContain('Nothing here has been')
    expect(PANEL).toContain('rewritten since')
  })

  it('and marks a round that was changed after it closed', () => {
    expect(code).toContain('{m.amended}')
  })
})

describe('what it must never become', () => {
  it('carries no score, tier, arrow or direction', () => {
    /* The moment this renders an arrow it has started rating people. */
    expect(strip(PANEL)).not.toMatch(/improv|declin|better|worse|trend|score|tier|↑|↓|→/i)
  })

  it('counts differing accounts without characterising them', () => {
    const near = strip(PANEL).slice(strip(PANEL).indexOf('m.differences'))
    expect(near).toContain('accounts differed')
    expect(near).not.toMatch(/\b(concern|problem|risk|bad)\b/i)
  })
})
