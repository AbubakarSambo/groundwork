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
 * THIS IS NOT A REORDERING, AND THE REORDERING WAS THE WRONG IDEA. `reportWaitingForMe` is
 * `mine && releasedAt && !activated`, and `activated` is `isInitiator || ...` - so it is
 * structurally false for a lead. Nothing in this product tells a lead to read their own report.
 * What summons them is "report ready - you release it" and "The lead decides this one". Their two
 * jobs are release and resolve, and jobs belong above the content they act on.
 *
 * So the panels stay where they are. What changes is that a panel earns its space by having
 * something in it.
 *
 * THE RULE ALREADY EXISTED HERE, half-applied: `one-list-not-three` says a count of nothing does
 * not get a tile and the signal returns the moment there is a number, and "How this report is put
 * together" was already a <details>. This finishes it.
 *
 * Measured after: content at 589px instead of 856, 18% instead of 24%, page 3,329px instead of
 * 3,498 - on a report where the reveal row still had work to show. A settled one collapses further.
 */
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
const REPORT = strip(readFileSync(join(__dirname, 'ReportPage.tsx'), 'utf8'))
const ADMIN = strip(readFileSync(join(__dirname, '..', 'grounds', 'GroundAdminPage.tsx'), 'utf8'))

describe('a panel with nothing to say is a line', () => {
  it('reads the real files, so an empty one cannot pass', () => {
    expect(REPORT.length).toBeGreaterThan(5000)
    expect(ADMIN.length).toBeGreaterThan(5000)
  })

  it('resolution is one line until there is a resolution', () => {
    expect(REPORT).toMatch(/if \(!resolutionState && !data\?\.resolution\) \{/)
    expect(REPORT).toMatch(/Resolution · not set yet/)
    /* The section it replaced, which announced its own emptiness at full size. */
    expect(REPORT).not.toMatch(/>No resolution state set yet\.</)
  })

  it('and comes back whole the moment there is one to act on', () => {
    /* The early return is guarded on BOTH being absent, so any resolution renders the section. */
    const early = REPORT.slice(REPORT.indexOf('if (!resolutionState && !data?.resolution)'), REPORT.indexOf('if (!resolutionState && !data?.resolution)') + 400)
    expect(early).toMatch(/return \(/)
    expect(REPORT).toMatch(/<div style=\{\{[^}]*\}\}>Resolution<\/div>/)
  })

  it('the reveal row shows who to chase, and says nothing extra when there is nobody', () => {
    /*
     * The panel this was written about went with the report tab's body. The rule it protects -
     * a section with nothing to say is a line, not a panel - is kept by the shape that replaced
     * it: one row per person on the report itself, each carrying its own state, so there is no
     * "everybody has done it" panel left to render empty. A person who has done everything reads
     * as one line saying so.
     */
    const VIEW = readFileSync(join(__dirname, '..', '..', 'components', 'gw', 'TheSessionsReport.tsx'), 'utf8')
    expect(VIEW).toContain('Answered, and shown theirs')
    expect(VIEW).toContain('Not answered yet')
    expect(ADMIN).not.toMatch(/allActivated/)
  })

  it('THE ONE THAT MUST NOT COLLAPSE: staleness is never conditional on being settled', () => {
    /*
     * "What you are reading is the previous version" changes whether a reader trusts everything
     * below it. It is not a status panel and must never be folded away with them.
     */
    const banner = REPORT.slice(REPORT.indexOf('previous version') - 600, REPORT.indexOf('previous version'))
    expect(banner).not.toMatch(/allActivated|resolutionState/)
  })
})
