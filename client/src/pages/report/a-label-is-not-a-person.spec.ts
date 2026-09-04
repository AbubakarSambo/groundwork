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
const SRC = readFileSync(join(__dirname, 'ReportPage.tsx'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')

describe('a label is not a person', () => {
  it('the ON RECORD row resolves the label instead of printing it', () => {
    expect(SRC).toContain('{personFor(p.label)}')
    expect(SRC).not.toContain('>{p.label}</div>')
  })

  it('the fallback labels map to the people they stand for', () => {
    const i = SRC.indexOf('const personFor')
    expect(i).toBeGreaterThan(-1)
    const fn = SRC.slice(i, i + 500)
    expect(fn).toContain("'the initiator'")
    expect(fn).toContain('adminHandle')
    expect(fn).toContain('partHandle')
  })

  it('and a role somebody described themselves as is left alone', () => {
    /* "Renewals owner" is theirs. Only the schema's fallbacks are substituted. */
    const i = SRC.indexOf('const personFor')
    expect(SRC.slice(i, i + 500)).toContain('return label')
  })
})
