import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'

/**
 * U.10: A 1440-PIXEL PICTURE CHECK FOUND THE BOARD WAS A DIFFERENT PAGE.
 *
 * Two of the differences, guarded here so they cannot come back quietly: the board painted itself
 * a bespoke grey-blue (#EEF0F6) instead of the page's own cream token, and it drew its own dark
 * navy header card instead of the check-in shell every other check-in page uses.
 */
const CODE = readFileSync(join(__dirname, 'BoardPage.tsx'), 'utf8')

describe('the board looks like the rest of the product, not a page of its own', () => {
  it('paints itself with the shared page token, not a bespoke colour', () => {
    expect(CODE).toMatch(/background:\s*'var\(--gw-page\)'/)
    expect(CODE).not.toMatch(/#EEF0F6/)
  })

  it('uses the shared check-in header and tabs, not a dark navy card of its own', () => {
    expect(CODE).toMatch(/<TheCheckInHeader/)
    expect(CODE).toMatch(/active="board"/)
    /* The header this replaced painted itself var(--gw-dark) directly; that literal must be gone
       from the board's own header markup (it may still appear elsewhere, e.g. inside a comment
       quoting the old defect, so this checks the tag shape rather than the bare string). */
    expect(CODE).not.toMatch(/<header style=\{\{ background: 'var\(--gw-dark\)'/)
  })
})
