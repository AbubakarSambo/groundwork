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

  /**
   * AND THEN THERE WAS ONE, WHICH SETTLES IT BETTER THAN THE SENTENCE DID.
   *
   * This required the board to carry a precedence rule: "the report is where that is set out in
   * full. If the two ever read differently, the report is the record." That was the right answer
   * while there were two shared pictures of one check-in.
   *
   * There is one now. The report body a participant could open has gone - it was a fourth place to
   * read the same three findings - and each difference on the board carries both accounts and what
   * is at stake underneath it. So the sentence became a pointer to a page that is not there, which
   * is a worse fault than the ambiguity it was written to remove.
   *
   * The fault this file names is unchanged and is what is asserted: a reader must never be left
   * with two shared pictures and no idea which to trust. It is now impossible rather than
   * explained.
   */
  it('the board does not send a reader to a second document', () => {
    expect(BOARD).not.toContain('the report is the record')
    expect(BOARD).not.toMatch(/report is where that is set out in full/)
    expect(BOARD).not.toContain('holds the detail of what each account said')
  })

  it('and says outright that it is the picture itself, and that it moves', () => {
    /*
     * The wording changed with the plain-English rewrite of this block; the rule did not. What a
     * reader needed from the old precedence paragraph was that there is no second document to go
     * and find, and that this one is rebuilt rather than fixed. Both survive in fewer words.
     */
    expect(BOARD).toContain('This is the shared picture from this round of check-ins')
    expect(BOARD).toContain('It can change as the picture changes')
    expect(BOARD).toContain('The board updates as people share more')
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
