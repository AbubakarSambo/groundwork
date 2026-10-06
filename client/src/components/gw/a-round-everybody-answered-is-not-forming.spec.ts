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

/*
 * U.9: THE ROW NOW SAYS WHAT THE PROTOTYPE SAYS (sessions.txt): "Shared" or "Not shared". The rule
 * this file guarded still holds, and more simply: a round everybody answered no longer reads
 * "Forming", because no row says "Forming" at all. What is not out yet says "Not shared".
 */
describe('a round everybody answered is not forming', () => {
  it('says Shared once it is out, and Not shared otherwise, whoever it is waiting for', () => {
    expect(SRC).toContain('r.closed ? EVERY_SESSION.shared : EVERY_SESSION.notShared')
    expect(SRC).toContain("shared: 'Shared'")
    expect(SRC).toContain("notShared: 'Not shared'")
    expect(SRC).not.toContain("'Forming'")
  })

  it('and the longer label does not wrap in its pill', () => {
    expect(SRC).toContain("whiteSpace: 'nowrap'")
  })
})
