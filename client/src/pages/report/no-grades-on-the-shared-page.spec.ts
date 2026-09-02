import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * A GRADE ON A NAMED COLLEAGUE, ON THE PAGE EVERYONE READS.
 *
 * The "On record" list carried a colour-coded badge beside each person's name - green for high,
 * blue for moderate, amber for low. Observed in the running product it read:
 *
 *   ON RECORD   Lena Lead   1 session   moderate specificity
 *               Renewals owner   1 session   moderate specificity
 *
 * The only thing explaining it was a `title` attribute, which most people never see and no screen
 * reader announces by default. What it says on the page is: here is how well your colleague did.
 *
 * The report's own promise is that it shows where accounts agree or differ and never anybody's raw
 * answers. How concrete one person was is neither of those - it is an assessment of a person,
 * published to the people they work with.
 *
 * Nothing is lost. Each person keeps their own specificity in My record, privately, written as
 * something to act on rather than a mark their colleagues can read. Who checked in and how many
 * sessions they are on stays: that is participation, not judgement.
 */
const REPORT = readFileSync(join(__dirname, 'ReportPage.tsx'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
const MY_RECORD = readFileSync(join(__dirname, '../../components/gw/MyRecord.tsx'), 'utf8')

describe('no grades on the shared page', () => {
  it('reads the real files, so an empty one cannot pass', () => {
    expect(REPORT.length).toBeGreaterThan(5000)
    expect(MY_RECORD.length).toBeGreaterThan(1000)
  })

  it('the shared report does not label how specific a named person was', () => {
    expect(REPORT).not.toContain('specificityLabel')
    expect(REPORT).not.toMatch(/specificity</)
  })

  it('but it still says who is on record and how many sessions they are on', () => {
    /* Participation is a fact about the check-in. Removing the grade must not remove this too. */
    expect(REPORT).toContain('On record')
    expect(REPORT).toMatch(/session\$\{/)
  })

  it('and the person still gets their own specificity, privately', () => {
    /* If this ever goes, the grade was not moved anywhere - it was just deleted. */
    expect(MY_RECORD).toContain('Specificity across sessions')
  })
})
