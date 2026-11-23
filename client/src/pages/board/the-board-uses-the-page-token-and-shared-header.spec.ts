import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'

/**
 * U.10: A 1440-PIXEL PICTURE CHECK FOUND THE BOARD WAS A DIFFERENT PAGE.
 *
 * Two of the differences, guarded here so they cannot come back quietly: the board painted itself
 * a bespoke grey-blue (#EEF0F6) instead of the page's own cream token, and it drew its own dark
 * navy header card instead of the check-in shell every other check-in page uses.
 *
 * U.10 (a), REBUILT FROM THE SHARED PARTS: the page's own cream is no longer a literal inline
 * style on this page at all - it comes from the shared `Page` frame (components/gw/ui/Page.tsx),
 * which the board is now drawn inside, so the first test checks for `Page` instead of the string
 * that used to paint it by hand. The header is now the shared `CheckInHeader`
 * (components/gw/ui/CheckInHeader.tsx), not the older `components/gw/TheCheckInHeader.tsx` this
 * page used in the first pass (that file still runs the report pages, untouched here) - so the
 * second test looks for the new component's name.
 */
const CODE = readFileSync(join(__dirname, 'BoardPage.tsx'), 'utf8')

describe('the board looks like the rest of the product, not a page of its own', () => {
  it('paints itself with the shared page frame, not a bespoke colour', () => {
    expect(CODE).toMatch(/<Page>/)
    expect(CODE).not.toMatch(/#EEF0F6/)
  })

  it('uses the shared check-in header and tabs, not a dark navy card of its own', () => {
    /* 23 November (journey 3): the header and tabs are the board's frame on the design system (TheBoardFrame.tsx), drawn round
       every board this page draws; the shared Tabs inside it marks the Board tab as the one open. */
    expect(CODE).toMatch(/<TheBoardFrame/)
    expect(readFileSync(join(__dirname, 'TheBoardFrame.tsx'), 'utf8')).toMatch(/active="board"/)
    /* The header this replaced painted itself var(--gw-dark) directly; that literal must be gone
       from the board's own header markup (it may still appear elsewhere, e.g. inside a comment
       quoting the old defect, so this checks the tag shape rather than the bare string). */
    expect(CODE).not.toMatch(/<header style=\{\{ background: 'var\(--gw-dark\)'/)
  })
})
