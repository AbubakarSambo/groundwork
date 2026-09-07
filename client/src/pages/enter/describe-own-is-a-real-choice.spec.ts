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
 * situation is a first-class way to start a check-in, not a consolation prize.
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
const SRC = readFileSync(join(__dirname, 'EntryChatPage.tsx'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

/**
 * The describe-your-own CARD, from its opening tag to its closing one.
 *
 * ANCHORED ON THE CARD'S OWN LABEL, AND IT REFUSES TO FIND ANYTHING ELSE.
 *
 * The first version searched for `setPickedSituation('other')` and fell back to
 * the FIRST match if it could not locate the card. Two things call that setter:
 * this card, and the 11px underlined "describe your own" shortcut in the count
 * line above the grid. So deleting the card did not turn this file red - it
 * silently re-pointed every assertion at the shortcut link, and four of the six
 * tests went on passing about a control that no longer existed. Proved by
 * cutting the card out: 2 failed, 4 passed, including "states its label at full
 * strength" - which sliced around a label that was gone and asserted on an empty
 * string.
 *
 * That is the failure this whole file exists to catch, so there is no fallback
 * now. If the card is not there, this throws by name and every test in the file
 * goes red at once.
 */
/*
 * THE LABEL MOVED WITH THE CARD, AND THE CARD MOVED TO THE TOP.
 *
 * It read "None of these? Describe your own situation" while it sat last in a scrolling list, which
 * is the right question at the end of a list and the wrong one at the start, where nothing has come
 * before it to be none of. The picker is now describe-your-own first, then a dropdown, then one
 * group of cards - the same shape as /grounds/new.
 *
 * What this file protects has not changed and is checked below exactly as before: it is a
 * FULL-WIDTH BUTTON with its own label at full strength, not an 11px text link. That distinction is
 * the whole reason the file exists, and it survived the move.
 */
const CARD_LABEL = 'Describe your own situation'
const BLOCK = (() => {
  const anchor = SRC.indexOf(CARD_LABEL)
  if (anchor === -1) {
    throw new Error(
      `The describe-your-own CARD is gone from EntryChatPage.tsx: no "${CARD_LABEL}". ` +
        'The 11px "describe your own" shortcut in the count line is not a substitute - ' +
        'it is a text link at the top, not the full-width route for anyone the list does not fit.',
    )
  }
  const start = SRC.lastIndexOf('<button', anchor)
  const end = SRC.indexOf('</button>', anchor)
  const block = SRC.slice(start, end)
  // Belt and braces: the card's own setter must be inside the slice, so a
  // restructure that leaves the label but detaches the click cannot pass.
  if (!block.includes("setPickedSituation('other')")) {
    throw new Error('Found the card label but no setPickedSituation(\'other\') inside its button.')
  }
  return block
})()

describe('the describe-your-own card', () => {
  it('does not look switched off, which is what it looked like first time round', () => {
    // THE ORIGINAL REGRESSION. Dashed border, transparent background: the visual
    // language of a disabled control, on the one route that had to work.
    expect(BLOCK).not.toMatch(/border:\s*'1px dashed/)
    expect(BLOCK).not.toMatch(/background:\s*'transparent'/)
    expect(BLOCK).not.toMatch(/disabled/)
  })

  it('does not look like the other twenty-two either', () => {
    // THE SECOND REGRESSION, and the reason this file changed. A tile among tiles is a tile nobody
    // finds. It used to earn that by spanning the grid it sat in; it is now ABOVE the grid entirely,
    // full width by being its own block, and it keeps the accent border that marks it as different
    // in kind rather than in topic.
    expect(BLOCK).toMatch(/width:\s*'100%'/)
    expect(BLOCK).toMatch(/border:\s*'1\.5px solid var\(--gw-navy\)'/)
  })

  it('states its label at full strength, not in the muted grey', () => {
    // The slice is taken BACKWARDS from the label, so it is empty when the label
    // is missing - and an empty string satisfies every not.toMatch below. Hence
    // the positive assertion first: there has to be something here to judge.
    const at = BLOCK.indexOf(CARD_LABEL)
    expect(at).toBeGreaterThan(0)
    const label = BLOCK.slice(at - 220, at)
    expect(label).toMatch(/color:\s*'var\(--gw-navy\)'/)
    expect(label).not.toMatch(/color:\s*'var\(--gw-(sub|muted)\)'/)
  })

  it('says what it is, without asking a question about a list nobody has read yet', () => {
    /* "None of these?" was written for the bottom of a scrolling list. At the top it asks about
       cards that have not been shown. */
    expect(BLOCK).toMatch(/Describe your own situation/)
    expect(BLOCK).not.toMatch(/None of these/)
  })

  it('IS the top of the picker now, rather than being reachable from it', () => {
    /*
     * This used to check for an 11px shortcut in the count line, because the card itself was
     * eighteenth in a scroll and somebody decides whether to scroll before they have scrolled. The
     * card is first now, so the shortcut has nothing left to shortcut - and the stronger property
     * is checkable directly: the card comes BEFORE the group dropdown in the source.
     */
    expect(SRC.indexOf(CARD_LABEL)).toBeLessThan(SRC.indexOf('Or select from the options below'))
  })

  it('is still a button, and still reachable', () => {
    /* Loosened past the exact handler body: picking this card now also clears the scenario key, so
       that setup does not open with the last card's question for a situation nobody has named. What
       is being held is that the card sets 'other' when clicked, not the shape of the arrow body. */
    expect(BLOCK).toMatch(/onClick=\{\(\) =>[^}]*setPickedSituation\('other'\)/)
  })

  it('and clears the situation key, so setup does not ask the last card\'s question', () => {
    /*
     * THE FAILURE THIS PREVENTS. Setup now opens with the picked situation's own first question.
     * Clicking a card, going back, then choosing to describe your own would have left the key set,
     * so somebody typing about a contract would be asked "who is the new hire".
     */
    expect(BLOCK).toContain('setPickedScenario(null)')
  })
})
