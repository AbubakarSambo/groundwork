import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'

/**
 * THE LEAD WAS TOLD EVERYBODY HAD FINISHED WHETHER OR NOT THEY HAD.
 *
 * The release panel gated on `report?.createdAt` - on a Report ROW EXISTING. A row exists long
 * before a round is done: the API builds a forming picture as soon as anybody completes, marks it
 * `forming: true`, and attaches `sessionProgress` saying how many are still out. The participant's
 * page reads the same row and correctly says "A picture is forming... not everyone has checked in
 * yet."
 *
 * So one row was read two ways. The party was told it was incomplete; the lead was told "Everybody
 * has completed their sessions" and offered a button that reveals the picture to the whole team at
 * once AND activates billing. Seen on a check-in whose own header said "1 of 4 checked in", two
 * lines above the sentence claiming everybody was done.
 *
 * Releasing early is still allowed - a lead may want to close a round short. Claiming the round
 * finished is not.
 */
const PAGE = readFileSync(join(__dirname, 'GroundAdminPage.tsx'), 'utf8')
const CODE = PAGE.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

describe('what the lead is told before everyone has answered', () => {
  it('reads the forming flag the API already sends', () => {
    expect(CODE).toMatch(/\(report as any\)\?\.forming \?/)
  })

  it('says how many are still out, from sessionProgress', () => {
    expect(CODE).toMatch(/sessionProgress\.completed/)
    expect(CODE).toMatch(/sessionProgress\.total/)
  })

  /**
   * The exact regression: the finished-round sentence must be reachable only when it is true.
   * Asserted structurally - the sentence has to sit AFTER the forming test and after the
   * forming branch's own heading, which is what puts it in the else.
   */
  it('only claims everybody finished on the not-forming branch', () => {
    const test = CODE.indexOf('?.forming ?')
    const formingHeading = CODE.indexOf('A picture is forming')
    const claim = CODE.indexOf('Everybody has completed their sessions')
    expect(test).toBeGreaterThan(-1)
    expect(formingHeading).toBeGreaterThan(test)
    expect(claim).toBeGreaterThan(formingHeading)
  })

  it('and names the release honestly while it is still forming', () => {
    expect(CODE).toContain('Release it as it stands')
  })
})
