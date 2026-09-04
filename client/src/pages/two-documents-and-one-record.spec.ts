import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * TWO INFORMATION-ARCHITECTURE FAULTS, BOTH FIXED BY SAYING SOMETHING THAT WAS ALREADY TRUE.
 *
 * 1. THE BOARD AND THE REPORT BOTH SHOWED A SHARED PICTURE, AND NEITHER SAID WHICH WAS THE RECORD.
 *
 * A reader had two documents describing the same check-in and no way to know which to trust when
 * they differ. The answer already existed, written in board.service.ts where nobody using the
 * product can see it: the board is "a delivery-shaped rendering of the delivery-relevant parts of
 * the report", it "is NOT a replacement", its divergence section "is a POINTER", and "the report
 * holds the detail". That is now on the board, in the panel that already explains how to read it.
 *
 * 2. GROUNDWORK'S OWN PROMPT TOOLING SAT ON CUSTOMER ROUTES.
 *
 * /prompts and /prompts/test are top-level addresses inside a customer's app, and they rendered
 * inside the customer's rail - verified in the browser before the move. Under /admin they are
 * covered by CHROMELESS_PREFIXES like the rest of the back office. Nothing in the app ever linked
 * to them, so the move breaks no navigation; the redirects are for whoever has them bookmarked.
 *
 * NOT CHANGED: / and /grounds render the same page. The audit calls that a duplicate route, but the
 * code records it as a decision - "Signed in, the root IS your grounds - her ask" - so it stays.
 */
const APP = readFileSync(join(__dirname, '../App.tsx'), 'utf8')
const BOARD = readFileSync(join(__dirname, 'board/BoardPage.tsx'), 'utf8')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')

describe('two documents and one record', () => {
  it('reads the real files, so an empty one cannot pass', () => {
    expect(APP.length).toBeGreaterThan(5000)
    expect(BOARD.length).toBeGreaterThan(3000)
  })

  it('the board says the report is the record', () => {
    expect(BOARD).toContain('the report is the record')
  })

  it('and says the board is the delivery-relevant part of it, not a second opinion', () => {
    expect(BOARD).toContain('the parts that bear on')
    expect(BOARD).toMatch(/report is where that is set out in full/)
  })

  it('the prompt tools live under /admin', () => {
    expect(APP).toContain('path="/admin/prompts"')
    expect(APP).toContain('path="/admin/prompts/test"')
  })

  it('and are still behind the platform-admin gate after the move', () => {
    /* Moving a route is not the fix if it arrives ungated. */
    expect(APP).toMatch(/path="\/admin\/prompts"\s+element=\{<RequirePlatformAdmin>/)
    expect(APP).toMatch(/path="\/admin\/prompts\/test"\s+element=\{<RequirePlatformAdmin>/)
  })

  it('the old addresses forward rather than 404 for whoever bookmarked them', () => {
    expect(APP).toMatch(/path="\/prompts"\s+element=\{<Navigate to="\/admin\/prompts" replace \/>\}/)
    expect(APP).toMatch(/path="\/prompts\/test"\s+element=\{<Navigate to="\/admin\/prompts\/test" replace \/>\}/)
  })

  it('and /admin is what makes them chromeless, so the move actually changed something', () => {
    /* If this prefix ever loses /admin, the tools go back to wearing the customer rail. */
    const shell = readFileSync(join(__dirname, '../components/gw/AppShell.tsx'), 'utf8')
    expect(shell).toMatch(/CHROMELESS_PREFIXES = \[[^\]]*'\/admin'/)
  })
})
