import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * WHERE THE EARLIER ROUNDS LIVE: THE BOARD.
 *
 * They used to sit under the report tab's current picture, on the grounds that somebody looking
 * for the earlier moments of a report is already on the tab that shows it. That stopped being
 * true when the report tab became a LIST of sessions: there is no current picture on it any more
 * to put history underneath, and each session's report is its own page.
 *
 * "I need the board to carry the entire history in one place." The board is the one screen whose
 * job is the whole run, so the round history is part of it rather than a footnote under a report.
 * Still no route of its own - it is a panel on a page that already exists.
 */
const PANEL = readFileSync(join(__dirname, 'HowThisHasMoved.tsx'), 'utf8')
const BOARD = readFileSync(join(__dirname, '..', '..', 'pages', 'board', 'BoardPage.tsx'), 'utf8')
const PAGE = readFileSync(join(__dirname, '..', '..', 'pages', 'grounds', 'GroundAdminPage.tsx'), 'utf8')
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')

describe('where it sits', () => {
  it('on the board, which is the screen about the whole run', () => {
    expect(strip(BOARD)).toContain('<HowThisHasMoved')
  })

  it('and not back on the check-in page, which is now a list of sessions', () => {
    expect(strip(PAGE)).not.toContain('<HowThisHasMoved')
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
    /*
     * U.9 RE-REVIEW, ITEM B: THE DATE IS READABLE, NOT THE RAW VALUE THE SERVER SENDS. It used to
     * print `{m.takenAt}` bare ("2026-09-27"); the date is now read through the shared formatter,
     * inside one sentence with the session number and the count of differences.
     */
    expect(code).toContain('whenItWas(m.takenAt')
  })

  it('does not explain itself (the "Nothing here has been rewritten since" note was removed 15 November with the board explainers)', () => {
    expect(PANEL).not.toContain('rewritten since')
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

  it('counts where people differed without characterising it', () => {
    /*
     * "accounts differed" - "account" is banned in copy a person reads; it means what somebody said
     * and everywhere else in a product it means a login. The count and the refusal to characterise
     * it are what this protects.
     *
     * U.9 THIRD REVIEW: "reads differed from the one before" implied a change from the session
     * before this one, when `m.differences` is only ever a count of how many accounts differed
     * WITHIN that session's own reading (`divergences.length`, see how-this-has-moved.ts). It now
     * says "people saw N things differently", which does not claim a comparison it cannot make.
     */
    const near = strip(PANEL).slice(strip(PANEL).indexOf('m.differences'))
    expect(near).toContain('people saw')
    expect(near).toContain('differently')
    expect(near).not.toContain('accounts differed')
    expect(near).not.toContain('from the one before')
    expect(near).not.toMatch(/\b(concern|problem|risk|bad)\b/i)
  })
})
