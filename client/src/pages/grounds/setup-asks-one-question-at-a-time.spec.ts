import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * "THE SETUP PAGE IS STILL MESSY AND HARD TO GO THROUGH."
 *
 * Said after the tab had already been cut into five named, numbered bands - so naming them was not
 * the fix. All five stayed open at once: roughly four hundred lines of controls in one column, so
 * changing the timeframe meant scrolling past everybody's invitation and reading both privacy
 * toggles on the way, and nothing on screen said what anything was currently set to.
 *
 * REPOINTED FOR THE PEOPLE-AND-SETUP REBUILD (29 Sept). The single numbered accordion this spec
 * used to pin - `Fold`, `openSetupBand`, one band open at a time - is the mechanism the rebuild
 * retires: CheckInPeopleAndSetup.tsx follows the prototype instead
 * (docs/prototype/screens/A4-people-roles-and-access/check-in-people-and-setup.txt), which is named
 * `Section`s ("Who's in it", "How it runs", "Who sees what", ...) with a value on every row and a
 * "Change" action per setting, not a single global accordion. `<Fold n=.../>`/`openSetupBand` no
 * longer exist anywhere in the file, so the old assertions on them would only be pinning dead code.
 *
 * WHAT THIS FILE STILL HAS TO PROVE, unchanged: a person is never shown a wall of every control at
 * once with nothing said about what it is currently set to, and pressing "Change" is what reveals
 * more, not a page load.
 */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
const PAGE = strip(readFileSync(join(__dirname, 'CheckInPeopleAndSetup.tsx'), 'utf8'))

describe('the People and setup tab', () => {
  it('is named sections, not one long column', () => {
    const sections = PAGE.match(/<Section\s/g) ?? []
    expect(sections.length).toBeGreaterThanOrEqual(6)
  })

  it('says what a setting is currently set to on its own row, before anything is opened', () => {
    /* FieldRow's `value` is what shows without opening anything - "Every weekday, 90 days", not a
       bare "How it runs" a reader has to click into to learn anything from. */
    const rows = PAGE.match(/<FieldRow\b[\s\S]*?\/>/g) ?? []
    expect(rows.length).toBeGreaterThan(0)
    for (const row of rows) expect(row).toMatch(/label=/)
  })

  it('reveals more controls behind "Change", rather than showing every control at once', () => {
    expect(PAGE).toContain("setEditingWhen((v) => !v)")
    expect(PAGE).toContain('{editingWhen &&')
  })

  it('the old numbered accordion is gone, not just renamed', () => {
    expect(PAGE).not.toMatch(/<Fold /)
    expect(PAGE).not.toContain('openSetupBand')
  })
})
