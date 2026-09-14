import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * THE REPORT SHOWED A SCHEMA WORD BESIDE A REAL JOB TITLE.
 *
 * The ON RECORD table read "the initiator" on one row and "Renewals owner" on the next - one an
 * internal fallback label, the other something a person actually described themselves as.
 *
 * WHY IT WAS THERE, WHICH IS NOT WHAT IT LOOKED LIKE. Reports are stored with no names in them on
 * purpose: the model is never given one, and parties reach it as role labels, so an artefact that
 * leaks cannot leak a name. `applyNames` puts names back on the way out for readers entitled to
 * them - but it walks `engagement` with `walkTextOnly`, deliberately, because `specificitySignal`
 * is KEYED by those labels and rewriting a key would break the lookup.
 *
 * So `parties[].label` staying raw is correct. Rendering it was the mistake. The page already
 * resolves the same people into `adminHandle` and `partHandle` for its prose; the label is resolved
 * at the point of display and left alone in the payload, where it is an identifier.
 *
 * Comments stripped: this file names the label it protects against.
 */
/**
 * WHERE THIS ASSERTS NOW, AND WHY IT IS A SWEEP RATHER THAN A POSITIVE.
 *
 * It read the ON RECORD table in `ReportPage.tsx`, which has had no importers for some time, and
 * checked that the table resolved the label before printing it. No live surface renders
 * `parties[].label` at all - so the positive assertion has nothing to point at.
 *
 * The rule is worth more as a sweep. `parties[].label` is an identifier: reports are stored with no
 * names in them on purpose, `specificitySignal` is KEYED by those labels, and the key is
 * deliberately left raw on the way out. So the hazard is not that one table got it wrong - it is
 * that the next surface to render `parties` will reach for the field that is right there. This
 * fails if any of them does.
 */
const SHARED: Record<string, string> = {
  'the session report': readFileSync(join(__dirname, '../../components/gw/TheSessionsReport.tsx'), 'utf8'),
  "a party's report": readFileSync(join(__dirname, '../../components/gw/SharedReportForAParty.tsx'), 'utf8'),
  'the board': readFileSync(join(__dirname, '../board/BoardPage.tsx'), 'utf8'),
  'my record': readFileSync(join(__dirname, '../../components/gw/MyRecord.tsx'), 'utf8'),
}

describe('a label is not a person', () => {
  it('no surface reads the parties array at all, which is the strongest form of it', () => {
    /*
     * Narrower and truer than matching on `.label`: the board renders `{p.label}` for a PATTERN,
     * which is a different field on a different object and is not a person. What must not happen
     * is a surface reaching into `parties[]` for a name that is not in there.
     */
    for (const [name, src] of Object.entries(SHARED)) {
      const code = src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
      expect(code, `${name} reads parties off the report`).not.toMatch(/\breport\.parties\b|\bd\.parties\b/)
      expect(code, `${name} prints a party label`).not.toMatch(/\{\s*(party|person)\.label\s*\}/)
    }
  })

  it('and the identifier is still an identifier, which is why this matters', () => {
    /* If the label stopped being keyed by, the sweep above would be protecting nothing and should
       be retired rather than left as decoration. */
    const OWN_READS = readFileSync(
      join(__dirname, '../../../../api/src/modules/reports/own-reads-only.ts'), 'utf8',
    )
    expect(OWN_READS).toMatch(/specificitySignal|keepOwnByLabel/)
  })
})
