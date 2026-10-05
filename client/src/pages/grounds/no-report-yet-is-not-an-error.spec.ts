import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * "NO REPORT YET" IS A STATE, NOT AN ERROR - AND THE 404 STAYS.
 *
 * `GET /grounds/:id/report` answers 404 when there is no report. That looked like something to
 * tidy: a red 404 in the console on every check-in that has not reported, which makes a real error
 * harder to see.
 *
 * IT IS NOT. The same 404 covers a check-in that does not exist, and one that is not yours. Turning
 * "no report yet" into a 200 would make "this check-in exists and has no report" a distinguishable
 * answer, and somebody probing ids could tell real check-ins from imaginary ones. That is
 * GW-PRI-04 in the API - `missing report does not leak ground existence` - and it is deliberate.
 *
 * So the noise is fixed on this side: the ground payload already carries `report`, so the client
 * knows the answer before it asks. It just asks anyway.
 *
 * THE COUPLING THIS CREATES, AND WHY IT IS GUARDED. Gating the query on `ground.report` means a
 * report created AFTER the page loaded leaves the gate shut. Anything that brings a report into
 * existence has to refresh the ground as well as the report, or the new report is never fetched
 * and the screen keeps saying there is not one.
 */
const read = (p: string) =>
  readFileSync(join(__dirname, p), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^\s*\/\/.*$/gm, '')

const ADMIN = read('GroundAdminPage.tsx')
const PARTY = read('GroundParticipantPage.tsx')
const SHARED = read('../../components/gw/SharedReportForAParty.tsx')

describe('no report yet is not an error', () => {
  it('reads the real files, so an empty one cannot pass', () => {
    for (const src of [ADMIN, PARTY, SHARED]) expect(src.length).toBeGreaterThan(500)
  })

  it('the view that asks for a report gates on the check-in saying there is one', () => {
    /* The LEAD page no longer asks at all - its report tab is a list of sessions, and each
       session's report is fetched by the page that shows it. The party view still reads the
       check-in's own report, so the gate has to be there. */
    const query = PARTY.slice(PARTY.indexOf("queryKey: ['report'"))
    expect(query.slice(0, 400)).toMatch(/enabled:[^\n]*\?\.report/)
    expect(ADMIN).not.toContain("queryKey: ['report', id],")
  })

  it('and the per-session call cannot make the same noise, because it does not 404', () => {
    /* `GET /report/session/:n` answers with the promised shape and zero counts when nothing has
       been synthesised yet - there is no "no report" error to swallow. The existence rule is kept
       a different way: a stranger gets NotFound, pinned in the API's privacy suite. */
    const SESSION = read('../../components/gw/TheSessionsReport.tsx')
    expect(SESSION).toContain("queryKey: ['session-shaped-report'")
    expect(SESSION).not.toContain('skipNotFoundToast')
  })

  it('THE COUPLING: everything that creates a report refreshes the ground as well', () => {
    // Otherwise the gate above stays shut and the new report is never fetched.
    /* `activate` was in this list, against SHARED. The reveal that called it is deleted, so there
       is no mutation left to check and requiring one would require the button back. Release is
       the only thing that now creates a report from the client. */
    for (const [name, src] of [['release', ADMIN]] as const) {
      const after = src.slice(src.indexOf('reportsApi.' + name))
      const block = after.slice(0, 500)
      expect(block, `${name} must invalidate the ground too`).toMatch(/queryKey: \['ground'/)
      expect(block, `${name} must still invalidate the report`).toMatch(/queryKey: \['report'/)
    }
  })

  it('and nobody has quietly turned the 404 into a 200 on the server', () => {
    /* The status code is the privacy property. If this ever needs to change, GW-PRI-04 is the
       conversation to have first - not a tidy-up. */
    const service = readFileSync(
      join(__dirname, '../../../../api/src/modules/reports/reports.service.ts'),
      'utf8',
    )
    /*
     * The SHAPE, not the one line it used to be. The server now says WHICH of the three
     * situations this is — nobody has answered, somebody has not finished, or it is being
     * written — because "Report not found" was shown to people who had just spent ten minutes
     * answering. The 404 is the privacy property and is unchanged: every branch below throws one.
     */
    const from = service.indexOf('if (!ground.report) {')
    expect(from, 'the missing-report branch has moved or been renamed').toBeGreaterThan(-1)
    const branch = service.slice(from, from + 1800)
    /* A stranger still gets the bare sentence and nothing about who is on the check-in. The engine's
       privacy sweep (finding 7, 5 October) made it the same sentence the board gives a stranger,
       "Check-in not found", so a report and a board answer someone with no access alike. It is
       still a 404 with no detail, which is what this test guards. */
    expect(branch).toMatch(/if \(!mine\) throw new NotFoundException\('Check-in not found'\)/)
    /* And the reason a party gets is still a 404, never a 200 with an empty body. */
    expect(branch).toMatch(/throw new NotFoundException\(\s*whyThereIsNoReportYet/)
    expect(branch).not.toMatch(/return \{ report: null/)
  })
})
