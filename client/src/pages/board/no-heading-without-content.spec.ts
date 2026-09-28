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
     * U.10: THE ZONE DIVIDERS THEMSELVES ARE GONE FROM THE BOARD.
     *
     * The prototype (board-as-lead.jpg/.txt) has no "AT A GLANCE" / "THE WORK" / etc. rule-and-label
     * banding between groups of sections - each section carries its own bold heading and nothing
     * else. So this test used to assert there were several `<Zone label=` lines and none of them
     * were gated on `has(...)` alone; now the right count is zero. The rule the Zone tripwire
     * protected - a heading must never appear over nothing - still holds: it is enforced by `shown`
     * (read by both the section's own `Sec` and its content, checked by the tests below), which
     * Zone was never part of enforcing in the first place.
     */
    const zoneLines = CODE.split('\n').filter(l => l.includes('<Zone label='))
    expect(zoneLines.length).toBe(0)
    expect(zoneLines.filter(l => /\bhas\(/.test(l))).toEqual([])
  })

  it('and every zone reads the same object its content reads', () => {
    for (const l of CODE.split('\n').filter(l => l.includes('<Zone label=') && l.includes('&&'))) {
      expect(l).toMatch(/shown\.\w+/)
    }
  })

  it('the empty-data half of the condition is what shown holds', () => {
    /** If this ever stops checking length, an empty list becomes a heading again. */
    expect(CODE).toMatch(/decisions: has\('decisions'\) && !!b\.decisions\?\.length/)
  })

  it('and objectives is the one exception, because empty is not empty there', () => {
    /*
     * THE RULE HELD AND MADE THE FEATURE UNREACHABLE.
     *
     * "No heading without content" is right for every other section: a heading over nothing reads
     * as a screen that failed to load. Objectives is not like the others. When the list is empty it
     * still has two things under it - the lead's "Add target" form, and the server's own prompt for
     * the empty case: "No targets set yet, so there is nothing for this board to measure progress
     * against." Gated on length, that sentence could never be read by the only person able to act
     * on it, and the form to act with was hidden beside it.
     *
     * Found by running a real setup: a chief of staff with ten salespeople and a number for each,
     * and nowhere in the product to put a single one of them. It is also why no objective in the
     * database had ever carried a target.
     *
     * So the exception is exactly as wide as the reason: empty renders only for a reader who can
     * add the first one. A party who cannot edit still gets no empty heading, which is the rule
     * this file is here to protect.
     *
     * U.10 RE-REVIEW ITEM A added `allowed('objectives') &&` in front of the length/canEditFrame
     * check - the switchboard's own per-situation gate (see what-the-switchboard-allows.ts), which
     * sits ahead of this exception rather than replacing it: a situation that never turns Targets on
     * still shows no heading, but one that does keeps exactly the behaviour this test protects.
     */
    expect(CODE).toMatch(/objectives: has\('objectives'\) && allowed\('objectives'\) && \(!!b\.objectives\?\.length \|\| !!b\.canEditFrame\)/)
  })
})
