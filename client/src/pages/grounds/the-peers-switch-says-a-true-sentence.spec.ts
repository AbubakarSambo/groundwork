import { describe, it, expect } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'

/**
 * GROUP 3'S REVIEW, BATCH A FAULT 2: "NOBODY SEES ANOTHER PERSON'S ANSWERS" WAS NOT TRUE.
 *
 * The "Each other's check-ins" switch on People and setup said, in every position, "Nobody sees
 * another person's answers. Everyone sees the team's report once you share it." - but the team's
 * report, which everyone in the check-in reads once it is shared, can and does quote a person's own
 * words under their name (`TheSessionsReport.tsx`, "Baraka Mwangi said..."). What the switch
 * (`peersVisibleToEachOther`) actually decides is whether that happens WITH names or with "a
 * colleague" in their place (`who-may-read-this-check-in.ts`, `peersAreNamedOn`) - never whether it
 * happens at all. The detail text now carries Hafsah's settled wording for the true fact (Conflict
 * A, 29 September, `docs/morning-report-ui.md`): "The people in this check-in, including your
 * manager, can see what you say in it.", plus the one thing the switch truly controls.
 */
const src = fs.readFileSync(
  path.join(__dirname, 'CheckInPeopleAndSetup.tsx'),
  'utf8',
)
const switchBlock = src.slice(src.indexOf('title="Each other\'s check-ins"'), src.indexOf('on={props.peersVisible}'))

describe('the "Each other\'s check-ins" switch says a true sentence in every position', () => {
  it('no longer claims nobody sees another person\'s answers', () => {
    expect(switchBlock).not.toMatch(/Nobody sees another person's answers/)
  })

  it('carries the settled true sentence about who can see what you say', () => {
    expect(switchBlock).toContain('The people in this check-in, including your manager, can see what you say in it')
  })

  it('says what the switch actually controls: naming, not whether content is shared', () => {
    expect(switchBlock).toContain('You are named to each other.')
    expect(switchBlock).toContain('You are not named to each other.')
  })
})
