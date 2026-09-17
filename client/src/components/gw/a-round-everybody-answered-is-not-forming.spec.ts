import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * "SESSION 1 · 3 OF 3 ANSWERED · FORMING", ON A ROUND WHOSE REPORT WAS ALREADY WRITTEN.
 *
 * Read off a lead's own screen. The report existed, complete, behind that row. Nothing was forming:
 * it was waiting for her to release it, and she is the only person who can. A status that describes
 * the product's state rather than the reader's next move is a status doing nothing.
 */
const SRC = readFileSync(join(__dirname, 'TheReportIsAListOfSessions.tsx'), 'utf8')

describe('a round everybody answered is not forming', () => {
  it('says it is ready to release once everybody has answered', () => {
    expect(SRC).toContain("r.answered >= r.total && r.total > 0 ? 'Ready to release' : 'Forming'")
  })

  it('and still says Released once it is out, and Forming while people are missing', () => {
    expect(SRC).toContain("r.closed ? 'Released'")
    expect(SRC).toContain("'Forming'")
  })

  it('and the longer label does not wrap in its pill', () => {
    expect(SRC).toContain("whiteSpace: 'nowrap'")
  })
})
