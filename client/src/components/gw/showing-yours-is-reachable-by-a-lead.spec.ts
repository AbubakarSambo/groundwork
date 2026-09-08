import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * A LEAD COULD NOT SHOW THEIR OWN REPORT TO THEIR TEAM.
 *
 * The mutual reveal - each person choosing to show their own report, the comparison opening only
 * when everybody has - had two copies: one on the lead's Report tab and one on the party page.
 * When the Report tab became a list of sessions the action went with the body it lived in, and
 * nobody noticed, because `reportsApi.activate(` still appeared in the party component. A lead is
 * almost always also a party to their own check-in, so the capability was gone for the person most
 * likely to need it, on a screen they open every day.
 *
 * TWO COPIES IS WHAT MADE IT INVISIBLE, so this does not add a third. It lives on the per-session
 * report, which is the thing the reveal is actually about, and both a lead and a party reach it
 * there. The party page keeps its own because that view renders the shared report itself; what is
 * guarded here is that a lead has a route to it at all.
 */
const read = (...p: string[]) => readFileSync(join(__dirname, ...p), 'utf8')
const VIEW = read('TheSessionsReport.tsx')
const API = read('..', '..', '..', '..', 'api', 'src', 'modules', 'reports', 'reports.service.ts')

describe('showing your own report', () => {
  it('is offered on the per-session report, which a lead does open', () => {
    expect(VIEW).toContain('Show mine')
    expect(VIEW).toContain('reportsApi.activate(groundId)')
  })

  it('only when there is something to decide', () => {
    /* Released, and this reader has not shown theirs. Before release there is nothing to reveal;
       after showing, the button would be an offer to do it twice. */
    expect(VIEW).toContain('{data.released && !data.iHaveShownMine && (')
  })

  it('and the report says both of those, so no screen has to work them out', () => {
    expect(API).toContain('released: !!ground.report?.releasedAt')
    expect(API).toContain('iHaveShownMine: !!me && shown.has(me.id)')
  })

  it('says what it costs before it is pressed', () => {
    expect(VIEW).toContain('This cannot be undone')
    expect(VIEW).toContain('at the same moment')
  })

  it('and tells the truth about which of the two things happened', () => {
    /* "Report revealed" was not true for anybody but the last person. The response says which. */
    expect(VIEW).toContain('res?.allActivated')
    expect(VIEW).toContain('becomes visible when everyone has done the same')
  })
})
