import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { openStatusLine, closedByLine } from './who-closes-this'

/**
 * THE REPORT MUST NOT INVENT A VOTE NOBODY HAS. W-UX-R.
 *
 * Her correction: "There's no propose and accept anything, the lead sees the report and resolution
 * options and decide for themselves."
 *
 * True of the six scenarios in `LEAD_DECIDES` and deliberately not the rest. The server has enforced
 * that split for a long time and sends `leadDecides` with every resolution state - but no client type
 * declared the field, so `ResolutionPanel` read it through `as any` and the REPORT PAGE, which had
 * written its own third copy of the interface, did not know it existed.
 *
 * So the report rendered the both-must-agree tally on every ground. On a contract renewal that read
 * "0 of 3 parties have confirmed an end state" with the contractor listed "Not yet" against their own
 * renewal - implying the org was waiting on their agreement for a decision that is the org's alone.
 * On the most-read screen in the product.
 */
describe('when the lead decides, there is no tally to show', () => {
  it('says who decides instead of counting confirmations', () => {
    expect(openStatusLine({ leadDecides: true, confirmedCount: 0, totalActive: 3 }))
      .toBe('The lead decides this one. Everyone can see the outcomes it can reach.')
  })

  it('and never emits a fraction, because a fraction implies a quorum', () => {
    /** "0 of 3" was the exact wording that made two people look like they were withholding. */
    expect(openStatusLine({ leadDecides: true, confirmedCount: 0, totalActive: 3 })).not.toMatch(/\d+ of \d+/)
  })

  it('the closed line does not claim everyone confirmed either', () => {
    expect(closedByLine({ leadDecides: true, totalActive: 3 })).toBe('Decided by the lead. Every account stays on the record.')
  })
})

describe('but peers still see the tally, because there it is true', () => {
  it('counts confirmations when nobody closes alone', () => {
    /**
     * The half that must NOT be tightened. Two cofounders genuinely both have to agree, and erring
     * toward "the lead decides" takes away somebody's say - which is why `LEAD_DECIDES` is a
     * conservative list rather than a default.
     */
    expect(openStatusLine({ leadDecides: false, confirmedCount: 1, totalActive: 2 }))
      .toBe('1 of 2 parties have confirmed an end state.')
  })

  it('and the closed line names the agreement', () => {
    expect(closedByLine({ leadDecides: false, totalActive: 2 })).toBe('All 2 parties confirmed the same end state.')
  })
})

describe('and the wording lives in one place', () => {
  const REPORT = readFileSync(join(__dirname, '../pages/report/ReportPage.tsx'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

  it('the report page does not word the tally itself', () => {
    /** The root cause was this sentence existing twice, in two components, one of which knew the rule. */
    expect(REPORT).not.toMatch(/parties have confirmed an end state/)
    expect(REPORT).toContain('openStatusLine(data)')
    expect(REPORT).toContain('closedByLine(data)')
  })

  it('and only lists per-party rows where every answer is awaited', () => {
    expect(REPORT).toMatch(/!data\.leadDecides && \(/)
  })

  it('and reads the shared type rather than a private copy of it', () => {
    expect(REPORT).toMatch(/type ResolutionStatus = ResolutionState & \{ groundStatus: string \}/)
  })
})
