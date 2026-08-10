import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * THE CATCH-ALL MUST NOT LOOK SWITCHED OFF.
 *
 * "My situation is different - I will describe it" was dashed-bordered,
 * transparent-backgrounded and grey-labelled, sitting among white cards with
 * solid borders and full-strength text. That is the visual language of a
 * disabled control. It has always worked when clicked; nothing on screen said
 * so.
 *
 * It matters more than a styling nit, because it is the only route for anyone
 * whose situation is not among the seventeen - and describing your own
 * situation is a first-class way to start a ground, not a consolation prize.
 *
 * Asserted against the source rather than a render: what is being held is the
 * absence of disabled-looking styling on this specific button, which a
 * screenshot test would not pin and a DOM query would not distinguish from any
 * other card.
 *
 * UPDATED AFTER THE FIRST FIX WAS NOT ENOUGH. Making it look like every other
 * card cured the disabled reading and created a second problem: it became
 * indistinguishable from seventeen near-identical tiles, at the bottom of a list
 * you have to scroll. Somebody who recognises none of the seventeen has to get
 * all the way down and then notice that one tile differs in KIND rather than in
 * topic.
 *
 * So the rule this file holds has moved on. It is no longer "looks like the
 * others". It is: this is the only route for anyone whose situation is not
 * listed, so it must be impossible to miss - full width, its own accent, and
 * reachable from the top of the list as well as the bottom.
 */
const SRC = readFileSync(join(__dirname, 'EntryChatPage.tsx'), 'utf8')

/** The describe-your-own button, from its onClick to its closing tag. */
const BLOCK = (() => {
  const i = SRC.indexOf("setPickedSituation('other')")
  expect(i).toBeGreaterThan(-1)
  // The CARD, not the shortcut link above the grid - both call the same setter.
  const cardIdx = SRC.indexOf("setPickedSituation('other')", SRC.indexOf('None of these?') - 900)
  const start = SRC.lastIndexOf('<button', cardIdx > -1 ? cardIdx : i)
  const end = SRC.indexOf('</button>', cardIdx > -1 ? cardIdx : i)
  return SRC.slice(start, end)
})()

describe('the describe-your-own card', () => {
  it('does not look switched off, which is what it looked like first time round', () => {
    // THE ORIGINAL REGRESSION. Dashed border, transparent background: the visual
    // language of a disabled control, on the one route that had to work.
    expect(BLOCK).not.toMatch(/border:\s*'1px dashed/)
    expect(BLOCK).not.toMatch(/background:\s*'transparent'/)
    expect(BLOCK).not.toMatch(/disabled/)
  })

  it('does not look like the other seventeen either', () => {
    // THE SECOND REGRESSION, and the reason this file changed. A tile among
    // tiles is a tile nobody finds. It spans the grid and carries its own accent.
    expect(BLOCK).toMatch(/gridColumn:\s*'1 \/ -1'/)
    expect(BLOCK).toMatch(/border:\s*'1\.5px solid var\(--gw-navy\)'/)
  })

  it('states its label at full strength, not in the muted grey', () => {
    const label = BLOCK.slice(BLOCK.indexOf('None of these?') - 220, BLOCK.indexOf('None of these?'))
    expect(label).toMatch(/color:\s*'var\(--gw-navy\)'/)
    expect(label).not.toMatch(/color:\s*'var\(--gw-(sub|muted)\)'/)
  })

  it('speaks to the person who has just read seventeen things and matched none', () => {
    expect(BLOCK).toMatch(/None of these\? Describe your own situation/)
  })

  it('is reachable from the top of the list, not only the bottom of it', () => {
    // Somebody decides whether to scroll before they have scrolled. The count
    // line above the grid offers the same route.
    const countLine = SRC.slice(SRC.indexOf('situations, grouped') - 400, SRC.indexOf('situations, grouped') + 400)
    expect(countLine).toMatch(/describe your own/)
    expect(countLine).toMatch(/setPickedSituation\('other'\)/)
  })

  it('is still a button, and still reachable', () => {
    expect(BLOCK).toMatch(/onClick=\{\(\) => setPickedSituation\('other'\)\}/)
  })
})
