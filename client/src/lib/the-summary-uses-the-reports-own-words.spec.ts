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

  it('and neither does the card that carries the same count', () => {
    const CARD = readFileSync(path.join(__dirname, '../components/gw/SessionReportCard.tsx'), 'utf8')
    /* The word survives in `openAreas` / `reachedAreas` / `AreaBlock`, which are names in the code
       and not text on the screen. Only what renders is checked: a JSX text run, not an identifier. */
    const rendered = CARD.match(/^\s*\{report\.agreements[\s\S]*?\}\.$/m)?.[0] ?? ''
    expect(rendered).not.toBe('')
    expect(rendered).not.toMatch(/\barea/i)
  })

  it('says nothing at all when the report holds nothing', () => {
    expect(alignmentLabel({ agreed: 0, open: 0 })).toBeNull()
    expect(alignmentLabel(null)).toBeNull()
  })
})
