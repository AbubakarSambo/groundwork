import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

/**
 * FAULT 6 (LIVE RE-WALK): "THIS ISN'T RIGHT, CORRECT IT" WAS DARK BLUE ON NAVY, AT 1440 AND 375.
 *
 * `TheReportYouSawAtTheEnd`'s own opening summary sits on a dark card (`background: var(--gw-
 * dark)`, TheReportYouSawAtTheEnd.tsx), and the correction link inside it (`correctionSlot`,
 * supplied by EntryChatPage.tsx) carried only `gwui-plain-link`, whose default ink is `var(--gw-
 * navy)` - unreadable on the very similar dark ground it sits on. The paragraph just above it, and
 * "Updated after your correction" beside it, already solve exactly this with an inline light ink
 * rather than a second link class (the colour genuinely depends on the one dark ground this
 * button sits on, nowhere else `gwui-plain-link` is used). The correction button now does the
 * same - no new one-off class, no new <style> tag.
 */
const src = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'EntryChatPage.tsx'),
  'utf8',
)

describe('the correction link inside the dark summary card is readable on it', () => {
  it('the correctionSlot button does not rely on the dark link class alone', () => {
    const start = src.indexOf('correctionSlot={')
    expect(start).toBeGreaterThan(-1)
    const end = src.indexOf('renderAdd=', start)
    const block = src.slice(start, end)
    /* The first, undismissed button in the slot - "This isn't right, correct it" - must carry a
       light ink, inline, the same way `correctedNote`'s sibling line in TheReportYouSawAtTheEnd
       does for this same card. */
    const buttonStart = block.indexOf("This isn't right, correct it")
    expect(buttonStart).toBeGreaterThan(-1)
    const buttonBlock = block.slice(Math.max(0, buttonStart - 400), buttonStart)
    expect(buttonBlock).toMatch(/className="gwui-plain-link"/)
    expect(buttonBlock).toMatch(/color:\s*'rgba\(255,\s*255,\s*255,\s*\.\d+\)'/)
  })

  it('and does not add a one-off style class or a <style> tag to do it', () => {
    const start = src.indexOf('correctionSlot={')
    const end = src.indexOf('renderAdd=', start)
    const block = src.slice(start, end)
    expect(block).not.toMatch(/<style/)
    expect(block).not.toMatch(/gwui-ink-white/)
  })
})
