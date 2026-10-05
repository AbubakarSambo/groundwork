import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * THE SCREEN AN ORG ADMIN LANDS ON.
 *
 * Bounded slices throughout: guards on these pages have passed against deliberately broken copy
 * three times in this repository because they read the whole file, where every word they wanted
 * appeared somewhere else.
 */
const CARD = readFileSync(join(__dirname, 'an-admin-lands-on-a-check-in-list.tsx'), 'utf8')
const LIST = readFileSync(join(__dirname, 'GroundsListPage.tsx'), 'utf8')
/* U.5: the card and checklist moved onto Today, where the prototype has them. */
const TODAY = readFileSync(join(__dirname, '..', 'today', 'TodayPage.tsx'), 'utf8')

describe('it stays past the first check-in', () => {
  it('is mounted on Today, and not inside any empty branch', () => {
    /* It used to hide the moment somebody opened a check-in, which is step two of five. On Today it
       sits above the page, whatever the page holds, and decides for itself when it is finished. */
    const i = TODAY.indexOf('<AdminFirstRun />')
    expect(i).toBeGreaterThan(-1)
    const mount = TODAY.slice(i - 400, i)
    expect(mount).not.toMatch(/length === 0|isLoading|isError/)
    expect(LIST.replace(/\/\*[\s\S]*?\*\//g, ' ')).not.toContain('<AdminFirstRun />')
  })

  /* U.3: the card is now the prototype's "Get <organisation> going" (see
     get-your-organisation-going.spec.tsx for what it reads). It still decides for itself when it is
     finished. The old checks on its counter's wording, its optional card and its "next step" border
     went with "Setting up <organisation>", which it replaces. */
  it('decides for itself when it is finished, and goes then', () => {
    expect(CARD).toContain('if (finished && !showWelcome) return null')
  })
})

describe('one action, one button', () => {
  it('the third button for opening a check-in is gone', () => {
    /*
     * The rail says it, the panel above says it, and the empty state said it a third time.
     *
     * Comments stripped first: the note explaining the removal names the button it removed, and a
     * guard that cannot tell prose from a rendered button makes documenting a fix impossible.
     */
    const code = LIST.replace(/\/\*[\s\S]*?\*\//g, ' ')
    expect(code).not.toContain('Open your first check-in')
    /*
     * U.20: the empty state's own words are now the prototype's exact sentence
     * (F4-small-states/states.txt, "No check-ins yet, a lead"), in place of this page's earlier,
     * unmatched one ("Open a check-in for a new hire, a cofounder conversation, or a team that
     * needs alignment.") - the thing being checked (one explanation of what a check-in is for,
     * not a third button) is unchanged.
     */
    expect(code).toContain('Describe what you want your team to check in about')
  })
})
