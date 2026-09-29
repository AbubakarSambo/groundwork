import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * A LONGER LABEL MADE THE WHOLE REPORT SCROLL SIDEWAYS ON A PHONE.
 *
 * The header carries a standing label saying which view you are on. It used to read "running this
 * check-in" and carried `whiteSpace: 'nowrap'`, which was fine at that length. It was replaced with
 * "Everyone in it - you are running this" - longer, still `nowrap` - and on a 375px viewport it
 * pushed the document to 403px, so every page under that header scrolled horizontally.
 *
 * FOUND BY MEASURING, NOT BY READING. The full suite was green throughout: nothing here renders at
 * a viewport size, so no test could see it. It was caught while measuring the report on mobile for
 * a different reason.
 *
 * The rule this encodes: a label whose text can change must not be `nowrap`. `nowrap` is a promise
 * about length, and copy does not keep promises about length.
 */
const CODE = readFileSync(join(__dirname, 'GroundAdminPage.tsx'), 'utf8')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')

describe('nothing pushes the page sideways', () => {
  it('reads the real file, so an empty one cannot pass', () => {
    expect(CODE.length).toBeGreaterThan(5000)
  })

  it('the standing view label is gone from the lead view (10 Sep 2026): the rail, the card and "Led by" already say it; only the admin variant remains, and it wraps', () => {
    expect(CODE).not.toMatch(/you are running this/)
    /**
     * ROUND 5, ITEM H1: THE ADMIN VARIANT IS ONE NOTE NOW, NOT TWO.
     *
     * "you are an admin here, not its lead" was a small standing line; a separate blue box below
     * it said the same fact in more words ("You are looking at this as an admin, not as its
     * lead"). Both are gone, folded into the one line the prototype itself uses
     * (read-only-view.txt, A4): "You can read this check-in's board and reports. {name} runs it."
     * - which the rule this file protects (no promise about length may be `nowrap`) still applies
     * to, since the name it interpolates can be any length.
     */
    const i = CODE.indexOf("You can read this check-in")
    expect(i).toBeGreaterThan(-1)
    expect(CODE.slice(Math.max(0, i - 200), i)).not.toMatch(/whiteSpace: 'nowrap'[^<]*$/)
  })

  it('and so is the one on the party view, which says the opposite thing', () => {
    const party = readFileSync(join(__dirname, 'GroundParticipantPage.tsx'), 'utf8')
    const i = party.indexOf('Your own check-in. The report shows')
    expect(i).toBeGreaterThan(-1)
    expect(party.slice(Math.max(0, i - 200), i)).not.toMatch(/whiteSpace: 'nowrap'[^<]*$/)
  })
})
