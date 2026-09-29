import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * WHAT WAS ACTUALLY BROKEN AT 375px, MEASURED RATHER THAN COUNTED.
 *
 * I told her the Context page was "a desktop page you scroll sideways on a phone", having counted
 * zero `@media` rules in its 1,293 lines. That was wrong and the measurement said so: the page is
 * built from flex rows that wrap and maxWidths that shrink, so its document scroll width at 375 is
 * exactly 375. Counting media queries measures how a page was written, not whether it works.
 *
 * Two things were genuinely broken, and both were in shared furniture rather than in that page:
 *
 *   1. `Sec`, the section heading every band on every page uses, put its source line beside the
 *      title with `white-space: nowrap` in a row that could not wrap. "what you put here guides
 *      every check-in · change any line in it" ran to 440 on a 375-wide screen.
 *
 *   2. The shell's bottom padding was the nav bar's 60px exactly, while the feedback pill and the
 *      help button float at 76 and 128 above the bottom. So the last thing on every page ended
 *      level with the nav and underneath both of them.
 */
const KIT = readFileSync(join(__dirname, 'kit.tsx'), 'utf8')
const SHELL = readFileSync(join(__dirname, 'AppShell.tsx'), 'utf8')

describe('a section heading on a narrow screen', () => {
  it('may wrap, and its source line may go to its own row', () => {
    /*
     * U.10 REVIEW: `Sec` grew a `size="board"` branch, returned early, ahead of the default one
     * this test is about - the board's own heading size (design-audit.md item, "the prototype's
     * size"), additive and unrelated to phone wrapping. That pushed the default branch's
     * `marginLeft: 'auto', textAlign: 'right'` line from offset 2677 past the old fixed 2400-char
     * window, which is a window shifting under a real, intended change - not a regression - so the
     * window is widened rather than the assertion weakened.
     */
    const sec = KIT.slice(KIT.indexOf('export function Sec('), KIT.indexOf('export function Sec(') + 3200)
    expect(sec).toMatch(/flexWrap: 'wrap'/)
    /* The one that clipped it: nowrap in a row with nowhere to go. */
    expect(sec).not.toMatch(/whiteSpace: 'nowrap'/)
    /* Still right-aligned where it fits beside the title. */
    expect(sec).toMatch(/marginLeft: 'auto', textAlign: 'right'/)
  })
})

describe('the bottom of every page on a phone', () => {
  it('clears the nav and the two things floating above it', () => {
    expect(SHELL).toMatch(/\.gw-main-content\s+\{ margin-left: 0 !important; padding-bottom: calc\(180px \+ env\(safe-area-inset-bottom\)\); \}/)
  })

  /* Measured: the floats sit at 76 and 128 from the bottom, so 60 was never enough. */
  it('and 60 was the nav alone, which is what it used to be', () => {
    expect(SHELL).not.toMatch(/padding-bottom: calc\(60px \+ env/)
  })
})
