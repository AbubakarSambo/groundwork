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

describe('and the live surface never invents a vote nobody has', () => {
  /*
   * MOVED FROM THE DEAD REPORT BODY. `ResolutionSection`, inside `ReportBody` (`ReportPage.tsx`),
   * used `openStatusLine`/`closedByLine` from this file directly and is deleted - it has not been
   * mounted by any route since the Report tab became a list of sessions. The live resolution flow,
   * `ResolutionPanel.tsx` (used on the board and the ending page), is a fuller rebuild that grew its
   * own wording rather than calling these two functions verbatim - but it was built to the same
   * rule this file protects, and that is what these assertions check: the per-party tally renders
   * only where every answer is genuinely awaited, never where the lead decides alone.
   */
  const PANEL = readFileSync(join(__dirname, '../components/gw/ResolutionPanel.tsx'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

  it('the per-party tally is gated on the lead not deciding alone', () => {
    expect(PANEL).toMatch(/totalActive > 0 && !leadDecides && \(/)
  })

  it('and no sentence on the panel claims a quorum where there is none', () => {
    /** The exact phrase that made two people look like they were withholding on a decision that was
        the lead's alone. The live panel earns the same guarantee with its own words. */
    expect(PANEL).not.toMatch(/parties have confirmed an end state/)
  })

  it('and reads the field off the shared resolution type, not a private copy of it', () => {
    expect(PANEL).toMatch(/import \{ resolutionApi \} from '@\/api\/resolution'/)
    expect(PANEL).toMatch(/const leadDecides = !!data\?\.leadDecides/)
  })
})
