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
 * Six rows now, each carrying its current value, one open at a time.
 */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
const PAGE = strip(readFileSync(join(__dirname, 'GroundAdminPage.tsx'), 'utf8'))

const start = PAGE.indexOf("{tab === 'settings' && (")
const TAB = PAGE.slice(start, PAGE.indexOf('{shareCodeModalOpen && (', start))

describe('the setup tab', () => {
  it('is folds, not one long column', () => {
    expect(start).toBeGreaterThan(-1)
    const folds = TAB.match(/<Fold /g) ?? []
    expect(folds.length).toBeGreaterThanOrEqual(5)
  })

  it('leaves no band as a bare heading, which is what it was before', () => {
    expect(TAB).not.toContain('<Sec n={setupBand()}')
  })

  it('opens one at a time', () => {
    expect(PAGE).toContain('setOpenSetupBand((cur) => (cur === n ? -1 : n))')
    expect(PAGE).toContain('open: openSetupBand === n')
  })

  it('says what each closed band is currently set to', () => {
    /* A row reading only "How it runs" is a row you have to open to learn anything from. */
    for (const m of TAB.match(/<Fold [^>]*>/g) ?? []) expect(m).toContain('summary=')
  })

  it('declares its state above the page\'s early returns', () => {
    /* This component returns early for several ground states. A hook under one of those is a hook
       that sometimes does not run, and React fails the whole page for it - which is what happened. */
    const hook = PAGE.indexOf('const [openSetupBand')
    const firstReturn = PAGE.indexOf('  if (ground.status ===')
    expect(hook).toBeGreaterThan(-1)
    expect(hook).toBeLessThan(firstReturn)
  })
})
