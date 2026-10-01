import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * A PANEL WITH NOTHING TO SAY TAKES ONE LINE, NOT A SECTION.
 *
 * Measured on a real released report: 856px - a full screen, 24% of the page - of panels before the
 * findings. The lead scrolls all of it every time, including past panels announcing they have
 * nothing in them.
 *
 * MOVED FROM THE DEAD REPORT BODY (`ReportPage.tsx`, `ReportBody`), now deleted. Two of this file's
 * original assertions tested the dead body directly and are retired with it, each for a different
 * reason, recorded here rather than silently dropped:
 *
 *   RESOLUTION, ONE LINE UNTIL THERE IS ONE. `ReportBody`'s `ResolutionSection` showed a single
 *   quiet line ("Resolution. Not set yet.") rather than nothing. The live `ResolutionPanel` (used
 *   on the board and the ending page) does not carry an equivalent for "nothing yet, far from the
 *   end" - it renders nothing at all until a decision is near or under way. That is a stronger form
 *   of the same rule (a panel with nothing to say now takes NO space, not one line), and it is the
 *   live, richer replacement for the whole resolution flow, not a regression introduced here. Kept
 *   as a note rather than a passing assertion, because asserting against the dead file again would
 *   test nothing live.
 *
 *   STALENESS NEVER CONDITIONAL ON BEING SETTLED. `ReportBody` polled the ground-level report and
 *   banner-warned "someone has checked in since this was written, you are reading the previous
 *   version". The per-session report (`TheSessionsReport.tsx`) is fetched fresh on each visit
 *   instead of cached with a staleness flag, and says when it was last updated
 *   (`lastChangedLine`/`lastUpdated`) rather than warning that what is on screen might be behind.
 *   Whether a live "you are reading an old version" banner is still needed on the rebuilt page is
 *   a product question rather than a mechanical move, so it is left as a note for Hafsah rather than
 *   decided here.
 */
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
const ADMIN = strip(readFileSync(join(__dirname, '..', 'grounds', 'GroundAdminPage.tsx'), 'utf8'))

describe('a panel with nothing to say is a line', () => {
  it('the reveal row shows who to chase, and says nothing extra when there is nobody', () => {
    /*
     * The panel this was written about went with the report tab's body. The rule it protects -
     * a section with nothing to say is a line, not a panel - is kept by the shape that replaced
     * it: one row per person on the report itself, each carrying its own state, so there is no
     * "everybody has done it" panel left to render empty. A person who has done everything reads
     * as one line saying so.
     */
    const VIEW = readFileSync(join(__dirname, '..', '..', 'components', 'gw', 'TheSessionsReport.tsx'), 'utf8')
    /* U.9: each person's line is a sentence now ("Aisha has checked in."). Still one row each. */
    expect(VIEW).toContain('has checked in.')
    expect(VIEW).toContain('has not checked in yet.')
    expect(ADMIN).not.toMatch(/allActivated/)
  })
})

/*
 * HAFSAH, 1 OCTOBER (decisions 70 and 71, request 99).
 * 70: the resolution panel shows nothing until a decision is near, as the prototype does; there is
 * no "Resolution. Not set yet." line. 71: the "you are reading an old version" notice stays, on the
 * rebuilt session report, read here in the live page.
 */
import { theTeamsReportIsBehind } from './SessionReportPage'

describe('the old-version notice is on the live session report (decision 71)', () => {
  const PAGE = readFileSync(join(__dirname, 'SessionReportPage.tsx'), 'utf8')
  it('says plainly that what you are reading is the previous version, and that it will refresh', () => {
    expect(PAGE).toContain('Someone has checked in since this was written, so it is being updated now. What you are reading is the previous version. It will refresh on its own.')
    expect(PAGE).toContain('readingThePreviousVersion && (')
  })
  it('is shown when somebody finished a check-in after the report was last written, and not before', () => {
    const report = { updatedAt: '2026-10-01T09:00:00Z', createdAt: '2026-09-20T09:00:00Z' }
    expect(theTeamsReportIsBehind(report, { checkIns: [{ completedAt: '2026-10-01T10:00:00Z' }] })).toBe(true)
    expect(theTeamsReportIsBehind(report, { checkIns: [{ completedAt: '2026-10-01T08:00:00Z' }] })).toBe(false)
  })
  it('reads when the report was last written, not when the row was first made', () => {
    /* A regenerated report is upserted, so createdAt stays at the first one for ever. */
    const report = { updatedAt: '2026-10-01T11:00:00Z', createdAt: '2026-09-20T09:00:00Z' }
    expect(theTeamsReportIsBehind(report, { checkIns: [{ completedAt: '2026-10-01T10:00:00Z' }] })).toBe(false)
  })
  it('and says nothing when there is no report yet', () => {
    expect(theTeamsReportIsBehind(null, { checkIns: [{ completedAt: '2026-10-01T10:00:00Z' }] })).toBe(false)
  })
})

describe('the resolution panel shows nothing until a decision is near (decision 70)', () => {
  it('there is no "Resolution. Not set yet." line on any live page', () => {
    const { execSync } = require('child_process')
    const found = execSync(`grep -rl "Resolution. Not set yet" ${join(__dirname, '..', '..')} --include=*.tsx || true`).toString().trim()
    expect(found).toBe('')
  })
})
