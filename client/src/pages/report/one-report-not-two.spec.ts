import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

/**
 * ONE REPORT, NOT TWO A CLICK APART.
 *
 * The Report tab held a summary of the report - pattern, areas, an honest close, a collapsed
 * Divergences section - and a button reading "View the full shared report (Venn view)" that left for
 * a page of its own. So the product carried two documents about one check-in, written at different
 * times, with no way to tell which one you had read. Nothing on the tab said the shorter one was
 * short. And the page had its own dark header and its own back-link, because it did not know it was
 * part of a check-in.
 *
 * The page's content is now a component the tab renders. The route redirects to it. The summary is
 * DELETED rather than kept alongside, because a summary nobody can tell is a summary was the defect.
 *
 * AND THE LEAD'S TAB NO LONGER RENDERS A REPORT AT ALL. It is a list of sessions, because a run is
 * six or twelve of them and one page cannot be all of their reports at once. That does not weaken
 * this rule, it satisfies it in the strongest way available: there is no second document about a
 * check-in on the lead's page to be a click apart from the first. The party view still embeds
 * `ReportBody`, and each session's own page renders the per-session report and nothing else.
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const REPORT = strip(readFileSync(path.join(__dirname, 'ReportPage.tsx'), 'utf8'))
const ADMIN = strip(readFileSync(path.join(__dirname, '../grounds/GroundAdminPage.tsx'), 'utf8'))
const PARTICIPANT = strip(readFileSync(path.join(__dirname, '../grounds/GroundParticipantPage.tsx'), 'utf8'))
const PARTY_REPORT = strip(readFileSync(path.join(__dirname, '../../components/gw/SharedReportForAParty.tsx'), 'utf8'))

describe('one report, not two', () => {
  it('the report body is a component, not a page only', () => {
    expect(REPORT).toMatch(/export function ReportBody\(/)
  })

  it('and no page carries a second report body at all', () => {
    /*
     * THE STRONGEST FORM OF THIS RULE, NOT A WEAKER ONE.
     *
     * It used to require the party view to embed `ReportBody` while the lead's page carried none.
     * Neither does now. Every part of that body has exactly one home - the disagreements with each
     * account and what is at stake on the board, the read across the accounts and the round's state
     * on the session page, the private lines for the conversation ahead on My record, the inferred
     * claims and their "Correct this" beside the correction control, the method note at the foot of
     * the board.
     *
     * That is this file's own principle carried the rest of the way. Two documents about one
     * check-in a click apart was the defect; a fourth place to read the same three findings was the
     * same defect wearing a tab.
     */
    expect(PARTY_REPORT).not.toContain('<ReportBody')
    expect(ADMIN).not.toContain('<ReportBody')
    expect(PARTICIPANT).not.toContain('<ReportBody')
  })

  /**
   * A participant used to get the same dead-end button as the lead once did: "View the full shared
   * report" navigated to a route that just redirects back to the tab already on screen, so nothing
   * visibly happened when it was clicked. Fixed the same way the lead's copy was fixed - embed the
   * real thing instead of linking to it.
   */
  it('and what the participant page offers instead is a real destination, not a dead button', () => {
    /* The reason the body was embedded at all: the button that preceded it navigated to a route
       that redirected back to the tab already on screen, so clicking it did nothing visible. What
       replaces the body has to clear that same bar - a page that exists and holds the content. */
    /* The forming message and its two buttons are gone entirely - see
       nothing-was-lost-when-the-body-went. What has to clear the dead-button bar is the tab's own
       first row, the board, which is a page that exists and holds the shared picture. */
    expect(PARTICIPANT).toContain('<SharedReportForAParty')
    expect(PARTY_REPORT).toContain('onOpenBoard()')
    expect(PARTICIPANT).toMatch(/onOpenBoard=\{\(\) => navigate\(`\/grounds\/\$\{id\}\/board`\)\}/)
  })

  /**
   * The link is what made them two. "Venn view" is a word for how one diagram is drawn; it should
   * never have been the name of a destination.
   */
  it('nothing offers to take you to the other one', () => {
    expect(ADMIN).not.toMatch(/View the full shared report/)
    expect(ADMIN).not.toMatch(/View the forming report/)
    expect(ADMIN).not.toMatch(/navigate\(`\/grounds\/\$\{id\}\/report`\)/)
    expect(PARTICIPANT).not.toMatch(/View the full shared report/)
    expect(PARTICIPANT).not.toMatch(/View the forming report/)
    expect(PARTICIPANT).not.toMatch(/navigate\(`\/grounds\/\$\{id\}\/report`\)/)
  })

  /** A dead link to somebody's report is worse than an extra hop, so the old route still resolves. */
  it('the old route redirects rather than 404s', () => {
    expect(REPORT).toMatch(/export function ReportPage\(\)/)
    expect(REPORT).toMatch(/<Navigate to=\{`\/grounds\/\$\{id\}\?tab=report`\} replace \/>/)
  })

  /** And the page it redirects to has to be able to open on that tab, or the redirect is a downgrade. */
  it('and the page opens on the tab the url asks for', () => {
    expect(ADMIN).toContain("searchParams.get('tab')")
  })

  /**
   * Embedded, the surrounding page already says which check-in this is and how to get back, so the
   * full-bleed wrapper and the dark header would be a second set of both.
   */
  it('the page chrome is dropped when embedded', () => {
    expect(REPORT).toMatch(/if \(embedded\) return/)
  })

  /** The header's read and the report's own headline were the same sentence, on one screen. */
  it('the header stops repeating the report headline on that tab', () => {
    expect(ADMIN).toMatch(/\{tab !== 'report' && \(/)
  })
})
