import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * "DO AWAY WITH REVEAL AT ONCE. REPORT UPDATES AS PEOPLE CHECK IN, THAT'S ALL IT IS."
 *
 * Three files used to guard the opposite. `the-reveal-is-both-sides-at-once` was a whole screen
 * that stood in front of a released report until the reader pressed a button;
 * `showing-yours-is-reachable-by-a-lead` pinned a second copy of the same button onto the
 * per-session report; and a branch on `activated: false` returned the screen instead of the page.
 * All three are gone and this is the file that keeps them gone.
 *
 * WHY, AND NOT BECAUSE A BUTTON IS ONE CLICK TOO MANY. Two things, both walked on a real check-in.
 *
 * It protected nothing. `sessionReport`, the read the report page actually makes, walls on
 * `released || viewerIsLead` and had never heard of activation - so the person stopped by the
 * button was handed the whole report, every party's own words included, one request later. The
 * button sat above the record it claimed to be gating, saying "this cannot be undone" about a door
 * that was already open.
 *
 * And it made the product lie about itself. The gate returned `{ activated: false }` with no
 * content, and the card that renders that payload printed "Not enough has been said yet to draw
 * one. Too little to say. 0 areas settled." to somebody whose session had just produced a full
 * three-party synthesis with an agreement, a divergence and a central question. The one screen
 * that tells a participant what their ten minutes were worth told them it was worth nothing.
 *
 * WHAT IS NOT THIS. Nobody reads a forming picture before giving their own account. That is a
 * different rule, it is about having ANSWERED rather than having pressed anything, and it is
 * guarded in forming-report-symmetry.spec.ts on the server. Deleting the reveal did not touch it.
 */
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ').replace(/^\s*\/\/.*$/gm, ' ')
const read = (...p: string[]) => strip(readFileSync(join(__dirname, ...p), 'utf8'))

const SURFACES: [string, string][] = [
  /* 'the report page' (ReportPage.tsx) came off this list when ReportBody - its only content -
     was deleted: the file left behind is a redirect, not a surface that can carry a reveal. */
  /* The per-session report page went in batch 2, group 5; your own report is drawn in My work. */
  ['your own report, in My work', '../grounds/MyWorkPage.tsx'],
]
const ELSEWHERE: [string, string][] = [
  ["a party's shared report", '../../components/gw/SharedReportForAParty.tsx'],
  ["the check-in's shared report", '../../components/gw/TheSessionsReport.tsx'],
  ['the end-of-check-in card', '../../components/gw/TheCheckInYouJustFinished.tsx'],
]

describe('nothing stands between a released report and the person it is for', () => {
  for (const [what, file] of [...SURFACES, ...ELSEWHERE]) {
    it(`${what} has no reveal on it`, () => {
      const code = read(file)
      expect(code).not.toContain('TheReveal')
      expect(code).not.toContain('reportsApi.activate')
      expect(code).not.toMatch(/Show mine/)
      expect(code).not.toMatch(/Show me the shared record/)
      /* The sentence that made a button out of nothing. */
      expect(code).not.toMatch(/cannot be undone/i)
    })
  }

  it('and no surface branches on activation to decide what to draw', () => {
    for (const [, file] of [...SURFACES, ...ELSEWHERE]) {
      expect(read(file)).not.toMatch(/!\s*report\.activated|activated\s*===\s*false/)
    }
  })

  it('the screen it used to show is deleted, not left behind unimported', () => {
    /* An unimported file is a thing somebody wires back up. */
    let there = true
    try { readFileSync(join(__dirname, 'the-reveal-is-both-sides-at-once.tsx')) } catch { there = false }
    expect(there).toBe(false)
  })
})
