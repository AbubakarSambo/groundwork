import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * THE REPORT TAB SAID "NO REPORT YET" AND "NOTHING TO REPORT ON YET" OVER A REPORT.
 *
 * Read off a live forming report - shared picture, central question, honest close, all rendered:
 *
 *   No report yet
 *   The report has not named an area the accounts agree or differ on.
 *   A picture is forming ... you can release what there is now
 *   SALES TEAM, FIRST QUARTER
 *   Nothing to report on yet.
 *
 * Both denials are gated on the ALIGNMENT read, which stays empty until the report names an area
 * the accounts agree or differ on - and a one-sided report cannot name one, because agreement is
 * two-sided. So both branches fire on exactly the report they are most wrong about, and this is
 * the third time round on this page: two earlier passes made the empty states agree with each
 * other, and neither noticed that the gate itself was the wrong question.
 *
 * A report exists or it does not, and `report` is what says so.
 */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
const ADMIN = strip(readFileSync(join(__dirname, '..', 'grounds', 'GroundAdminPage.tsx'), 'utf8'))
const REPORT = strip(readFileSync(join(__dirname, 'ReportPage.tsx'), 'utf8'))

describe('a report that exists', () => {
  it('is never announced as absent', () => {
    /* The 16px heading on the Report tab, not the one-line status in the check-in list. */
    const at = ADMIN.indexOf("fontSize: 16, fontWeight: 600, color: 'var(--gw-sub)' }}>No report yet")
    expect(at).toBeGreaterThan(-1)
    /* Gated on whether a report exists, not on whether it has named an alignment area. */
    expect(ADMIN.slice(Math.max(0, at - 200), at)).toContain('{!report && (')
  })

  it('and is never described as having nothing in it', () => {
    expect(REPORT).not.toContain("'Nothing to report on yet.'")
  })

  it('while a one-sided report still says what it cannot do', () => {
    expect(REPORT).toContain('The second is what makes it a comparison.')
  })
})
