import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { groundTabs } from './ground-tabs'

/**
 * MOVING THE PRIVATE REPORT COSTS NOBODY ANYTHING AND SHOWS NOBODY ANYTHING NEW.
 *
 * "Your private report" moved from the Report tab to My record, so Report means the whole check-in
 * and My record means your part of it - the same whole-against-part split the two views' labels
 * already use.
 *
 * A move like that can go wrong two ways: somebody loses a thing they had, or somebody gains a
 * thing that is not theirs. This checks both, for each kind of viewer.
 */
const read = (p: string) =>
  readFileSync(join(__dirname, p), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')

const RUNS_IT = read('GroundAdminPage.tsx')
const PARTY = read('GroundParticipantPage.tsx')

describe('nobody loses and nobody gains', () => {
  it('reads both views, so an empty file cannot pass', () => {
    for (const s of [RUNS_IT, PARTY]) expect(s.length).toBeGreaterThan(5000)
  })

  /**
   * REVIEW ROUND 3, "YOUR WORK" REBUILD: `<WhatYouAreCarryingForward` NO LONGER SITS INLINE IN
   * EITHER PAGE. Both pages render `<YourWork` on My record/My work now (components/gw/checkin/
   * YourWork.tsx), and it is YourWork - not the two calling pages - that renders
   * `WhatYouAreCarryingForward`. The two things this test protects still hold, checked one file
   * over: the private report still renders somewhere reachable from My record, and the Report tab
   * still does not carry it.
   */
  it('NOBODY LOSES: both views still render the private report, on My record', () => {
    const renderOf = (src: string) => {
      const at = src.search(/\{tab === '(?:myrecord|record)' &&/)
      expect(at).toBeGreaterThan(-1)
      const next = src.slice(at + 1).search(/\n\s*\{tab === '/)
      return src.slice(at, next > -1 ? at + 1 + next : src.length)
    }
    for (const [name, src] of [['runs it', RUNS_IT], ['party', PARTY]] as const) {
      expect(renderOf(src), `${name} must render YourWork on My record`).toMatch(/<YourWork/)
    }
    const YOUR_WORK = read('../../components/gw/checkin/YourWork.tsx')
    expect(YOUR_WORK).toMatch(/<WhatYouAreCarryingForward/)
  })

  it('and the Report tab no longer carries it, on either view', () => {
    for (const src of [RUNS_IT, PARTY]) {
      const report = src.slice(src.indexOf("tab === 'report'"))
      const untilNext = report.slice(0, report.indexOf("tab === '", 20) + 1 || 2000)
      expect(untilNext).not.toMatch(/<WhatYouAreCarryingForward/)
      expect(untilNext).not.toMatch(/<YourWork/)
    }
  })

  it('NOBODY GAINS: the view that runs it will not render a record for a non-party', () => {
    /*
     * `groundTabs` leaves the tab out, which hides the door. `?tab=record` typed into the address
     * bar reaches the branch anyway, so the branch checks too.
     */
    expect(RUNS_IT).toMatch(/tab === 'myrecord' && viewerIsAParty &&/)
  })

  it('and does not fetch a record it has no business fetching', () => {
    for (const key of ['my-record', 'my-solo-report', 'my-specificity']) {
      const q = RUNS_IT.slice(RUNS_IT.indexOf(`'${key}'`))
      expect(q.slice(0, 260), `${key} must be gated`).toMatch(/enabled:[^\n]*viewerIsAParty/)
    }
  })

  it('the tab itself is offered only to somebody who is in the check-in', () => {
    const asParty = groundTabs({ contextEnabled: true, canRunThisCheckIn: true, isAParty: true })
    const notAParty = groundTabs({ contextEnabled: true, canRunThisCheckIn: true, isAParty: false })
    expect(asParty.map(t => t.key)).toContain('record')
    expect(notAParty.map(t => t.key)).not.toContain('record')
  })

  it('and the five sections that never rendered are gone, not hidden', () => {
    /*
     * `report.pattern`, `.assumptions`, `.clarity`, `.alignmentReached`, `.areasRequiringAlignment`
     * are not on a check-in report - GET /grounds/:id/report returns nineteen keys and these are
     * none of them. They belong to the entry flow's shape. Every condition was always false.
     */
    const shared = read('../../components/gw/SharedReportForAParty.tsx')
    for (const dead of ['report.pattern', 'report.assumptions', 'report.clarity',
                        'report.alignmentReached', 'report.areasRequiringAlignment']) {
      expect(shared, `${dead} reads a field a check-in report does not have`).not.toContain(dead)
    }
  })
})
