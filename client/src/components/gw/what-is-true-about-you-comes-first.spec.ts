import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * WHAT IS TRUE ABOUT YOU COMES BEFORE WHAT SOMEBODY ELSE SET.
 *
 * The Setup tab is a flex column whose children carry explicit `order` values. Source order and
 * screen order are deliberately different: written out, it begins with a disclaimer and two panels
 * that belong to the lead, so a party's first sight of the tab was three statements about absence
 * and permission before anything that was actually about them. The `order` values put the person's
 * own facts first without deleting anything.
 *
 * THAT IS WHY `MyParticipation` RETURNS A FRAGMENT. Wrapping its three sections in a div would make
 * them one flex child, collapse three `order` values into one, and put them back behind the
 * disclaimer - the page would still render, nothing would throw, and the decision would be quietly
 * undone. A screenshot would catch it; nothing else would.
 *
 * Asserted on the source because the thing at risk IS the structure. Rendering it would need the
 * flex parent, and the parent is the page.
 */
const read = (p: string) => readFileSync(join(__dirname, p), 'utf8')
const COMPONENT = read('MyParticipation.tsx')
const PAGE = read('../../pages/grounds/GroundParticipantPage.tsx')

describe('what is true about you comes first', () => {
  it('reads the real files, so an empty one cannot pass', () => {
    expect(COMPONENT.length).toBeGreaterThan(500)
    expect(PAGE.length).toBeGreaterThan(5000)
  })

  it('THE ONE THAT MATTERS: the sections stay direct children, in a fragment', () => {
    /* The return is `<>` and not a styled wrapper. A div here silently reorders the tab. */
    expect(COMPONENT).toMatch(/return \(\s*<>/)
    expect(COMPONENT).not.toMatch(/return \(\s*<div/)
  })

  it('and each keeps its own place in the column', () => {
    /* Distinct order values, none of them merged. Two of them now, not three: the privacy
       reminder that carried the third was removed - "you are over doing it with the privacy
       reminders", and it was the loudest block on a page about a person's own standing. The
       structure this guards is unchanged; there is one less thing in it. */
    const orders = [...COMPONENT.matchAll(/order:\s*(\d+)/g)].map(m => Number(m[1]))
    expect(orders.length).toBeGreaterThanOrEqual(2)
    expect(new Set(orders).size).toBe(orders.length)
  })

  it('the reader comes before the lead-owned panels, whatever the source order', () => {
    const mine = [...COMPONENT.matchAll(/order:\s*(\d+)/g)].map(m => Number(m[1]))
    const panels = [...PAGE.matchAll(/order:\s*(\d+)\s*\}\}>\s*<(?:Baseline|StartingPoint)Panel/g)]
      .map(m => Number(m[1]))
    // The person's own facts sit above the panels somebody else fills in.
    expect(Math.min(...mine)).toBeLessThan(Math.min(...panels))
  })

  it('and the page still renders it inside the flex column that gives order meaning', () => {
    const tab = PAGE.slice(PAGE.indexOf("{tab === 'settings' && ("))
    expect(tab.slice(0, 400)).toMatch(/display: 'flex', flexDirection: 'column'/)
    expect(tab).toMatch(/<MyParticipation/)
  })
})
