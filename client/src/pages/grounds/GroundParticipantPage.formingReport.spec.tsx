import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

/**
 * FORMING-REPORT SYMMETRY guard (client). The participant page used to show
 * a static "Report is being prepared... will be available once released"
 * message for ANY unreleased report, even once the backend started sending
 * forming content (report.forming) - the admin page already had a "View the
 * forming report" button gated on the same flag. Source-level: the
 * participant page must branch on report.forming and offer a way in.
 *
 * The "way in" used to be a button that navigated to `/grounds/${id}/report`
 * - a route that just redirects back to the tab already on screen, so the
 * button was a dead end (see one-report-not-two.spec.ts). The fix embeds
 * `ReportBody` directly, the same way the lead's page already did for the
 * released state.
 */
/* The shared report a party reads moved into `SharedReportForAParty`, so the view that runs a
   check-in can show a lead the same thing. Both, joined, so these follow the content. */
const here = dirname(fileURLToPath(import.meta.url))
const src = [
  readFileSync(join(here, 'GroundParticipantPage.tsx'), 'utf8'),
  readFileSync(join(here, '../../components/gw/SharedReportForAParty.tsx'), 'utf8'),
]
  .join('\n')
  /* COMMENTS STRIPPED. Both files now explain in prose what was removed, quoting the copy - so an
     unstripped read fails on the explanation of the fix. The mirror of the trap
     `a-guard-that-a-comment-satisfies-is-not-a-guard` names. */
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '')

/**
 * AND THEN THE BANNER ITSELF WENT, WHICH SETTLES THIS FILE'S QUESTION RATHER THAN LOSING IT.
 *
 * "Remove this: Shared report / A picture is forming / Not everyone has checked in yet... / See what
 * has emerged so far / My sessions."
 *
 * This file existed because that message was a dead end - three sentences saying a picture was
 * forming with nothing to open. The fix was to give it doors. The better fix is that the message is
 * gone: it described a half-built report in prose on a tab whose first row is already a door to the
 * board, and My record's coverage bars now say exactly what the report can and cannot say yet, in
 * one row, on the page that is about that.
 *
 * A dead end cannot exist where there is no message. What is asserted now is that the two things
 * that made it a dead end have not come back.
 */
describe('GroundParticipantPage: no dead end where a forming report used to be announced', () => {
  it('does not announce a forming picture in prose', () => {
    /* The banner's own sentences. Not the phrase in general: the withheld state next door still
       says a picture is forming and that this reader has not answered, which is a different fact
       said to somebody who can act on it - by checking in. */
    expect(src).not.toContain('Not everyone has checked in yet, so this is not final')
    expect(src).not.toContain('See what has emerged so far')
    expect(src).not.toContain('Report is being prepared')
  })
  it('and what tells somebody how far off a report is now says it in one row', () => {
    /* The coverage bars on My record: how many of the five things a full report says it can say
       yet, and why not. A meter rather than a paragraph, on the page that is about the record. */
    const COVERAGE = readFileSync(
      join(here, '../../components/gw/WhatTheReportCanSayYet.tsx'), 'utf8',
    )
    expect(COVERAGE).toContain('What the report can say so far')
    expect(COVERAGE).toContain('Dashed ones it cannot say yet')
  })
})
