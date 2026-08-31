import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * A REPORT THAT EXPLAINS REPORTS BEFORE IT SAYS ANYTHING.
 *
 * Three panels - "What is open, first", "What matters most, first", "Honest closes" - described how
 * Groundwork writes reports in general, in three columns, as the first thing on the page. Above a
 * reveal-status box and a stale-version banner. So roughly the top quarter of a report was about
 * reports, and a reader reached "4 agreed, 1 still open" by scrolling past an explanation of what
 * that sentence would mean.
 *
 * The words are good and they stay. They are closed by default now: somebody reading their second
 * report does not need the manual again, and somebody reading their first needs it after they have
 * seen the thing it describes.
 *
 * Measured on the running page: 3683px to 3502px, and the panels are one click away.
 *
 * Comments stripped: the file quotes the copy it protects.
 */
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
const SRC = strip(readFileSync(join(__dirname, 'ReportPage.tsx'), 'utf8'))
const CSS = readFileSync(join(__dirname, '..', '..', 'index.css'), 'utf8')

describe('the finding comes before the method', () => {
  it('the legend is a disclosure, not a wall', () => {
    expect(SRC).toContain('<details className="gw-legend">')
    expect(SRC).toContain('<summary>How this report is put together</summary>')
  })

  it('and it is closed until asked for', () => {
    /* `<details>` without `open` is closed. If somebody adds it, this is the line that notices. */
    expect(SRC).not.toMatch(/<details className="gw-legend"\s+open/)
  })

  it('the three explanations are kept, not deleted', () => {
    for (const h of ['What is open, first', 'What matters most, first', 'Honest closes']) {
      expect(SRC).toContain(h)
    }
  })

  it('the summary looks like a control and hides the browser marker', () => {
    expect(CSS).toMatch(/\.gw-legend > summary \{[^}]*cursor: pointer/)
    expect(CSS).toContain('.gw-legend > summary::-webkit-details-marker { display: none; }')
  })

  it('and the three columns become one on a narrow screen', () => {
    expect(CSS).toMatch(/@media \(max-width: 760px\) \{ \.gw-legend > div \{ grid-template-columns: 1fr/)
  })
})
