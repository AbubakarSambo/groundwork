import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { alignmentLabel, alignmentShort } from './alignment'

/**
 * A SUMMARY MAY NOT INTRODUCE A NOUN ITS SOURCE NEVER USES.
 *
 * The header read "All 2 areas still open". The report it summarises has headings for "What was
 * agreed" and "What's still open" and no heading, anywhere, for an area - so the one word a lead
 * had to understand was the one word the report never explained.
 *
 * These phrases are read by people who cannot see this file, so the check is on the rendered
 * strings rather than on the code that builds them.
 */
describe('the summary uses the report\'s own words', () => {
  const READS = [
    { agreed: 3, open: 0 },
    { agreed: 0, open: 2 },
    { agreed: 3, open: 2 },
    { agreed: 1, open: 1 },
  ]

  it('never says "area"', () => {
    for (const r of READS) {
      expect(alignmentLabel(r)).not.toMatch(/\barea/i)
      expect(alignmentShort(r)).not.toMatch(/\barea/i)
    }
  })

  it('and the card that carried the count no longer carries one at all', () => {
    /*
      IT USED TO PRINT "3 agreed, 1 still open" UNDER A STATUS WORD, and the rule here was that
      neither said "area" - an undefined noun that was a heading nowhere on the screen.

      The card is now A - what one person said this time - and a count of what everybody agreed is
      a statement about the shared picture, which is a different report. So there is no count to
      keep the word out of. Asserted rather than deleted: a count is exactly the thing somebody
      adds back to a close card, and this is where they find out it belongs on the other one.
    */
    const CARD = readFileSync(path.join(__dirname, '../components/gw/TheCheckInYouJustFinished.tsx'), 'utf8')
    expect(CARD).not.toMatch(/report\.agreements/)
    expect(CARD).not.toMatch(/\barea/i)
  })

  it('says nothing at all when the report holds nothing', () => {
    expect(alignmentLabel({ agreed: 0, open: 0 })).toBeNull()
    expect(alignmentLabel(null)).toBeNull()
  })
})
