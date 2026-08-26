import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'

/**
 * NO HEADING WITHOUT SOMETHING UNDER IT. W-UX-7.
 *
 * Her audit note: a heading called "Against the plan" with nothing under it - "Looks broken."
 *
 * It was not one heading. Every zone on the board tested only whether the SECTION was switched on,
 * while the content beneath it also tested whether there was any DATA. Two conditions for one thing,
 * each defensible alone, nothing reconciling them - so every board showed bare headings on its first
 * day, before anybody had put anything in.
 *
 * `shown` is now the single condition, read by the zone and by its content. This guards that neither
 * side goes back to testing `has(...)` on its own.
 */
const CODE = readFileSync(join(__dirname, 'BoardPage.tsx'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

describe('a zone renders only when its content will', () => {
  it('no Zone is gated on the section list directly', () => {
    /**
     * The tripwire: any `has(` in the same expression as a `<Zone`. That is the shape of the bug -
     * a heading asking "is this section on" while its content asks "is there anything in it".
     */
    const zoneLines = CODE.split('\n').filter(l => l.includes('<Zone label='))
    expect(zoneLines.length).toBeGreaterThan(4)
    expect(zoneLines.filter(l => /\bhas\(/.test(l))).toEqual([])
  })

  it('and every zone reads the same object its content reads', () => {
    for (const l of CODE.split('\n').filter(l => l.includes('<Zone label=') && l.includes('&&'))) {
      expect(l).toMatch(/shown\.\w+/)
    }
  })

  it('the empty-data half of the condition is what shown holds', () => {
    /** If this ever stops checking length, an empty list becomes a heading again. */
    expect(CODE).toMatch(/objectives: has\('objectives'\) && !!b\.objectives\?\.length/)
    expect(CODE).toMatch(/decisions: has\('decisions'\) && !!b\.decisions\?\.length/)
  })
})
