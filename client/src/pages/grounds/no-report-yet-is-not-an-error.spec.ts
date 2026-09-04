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

  it('neither view asks for a report the check-in says does not exist', () => {
    for (const src of [ADMIN, PARTY]) {
      const query = src.slice(src.indexOf("queryKey: ['report'"))
      expect(query.slice(0, 400)).toMatch(/enabled:[^\n]*\?\.report/)
    }
  })

  it('THE COUPLING: everything that creates a report refreshes the ground as well', () => {
    // Otherwise the gate above stays shut and the new report is never fetched.
    for (const [name, src] of [['release', ADMIN], ['activate', SHARED]] as const) {
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
    expect(service).toMatch(/if \(!ground\?\.report\) throw new NotFoundException/)
  })
})
