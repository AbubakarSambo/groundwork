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

  it('the standing view label is allowed to wrap', () => {
    const i = CODE.indexOf('Everyone in it - you are running this')
    expect(i).toBeGreaterThan(-1)
    /* The span that holds it, immediately above. */
    const span = CODE.slice(Math.max(0, i - 200), i)
    expect(span).not.toMatch(/whiteSpace: 'nowrap'[^<]*$/)
  })

  it('and so is the one on the party view, which says the opposite thing', () => {
    const party = readFileSync(join(__dirname, 'GroundParticipantPage.tsx'), 'utf8')
    const i = party.indexOf('Just yours - only you see this')
    expect(i).toBeGreaterThan(-1)
    expect(party.slice(Math.max(0, i - 200), i)).not.toMatch(/whiteSpace: 'nowrap'[^<]*$/)
  })
})
