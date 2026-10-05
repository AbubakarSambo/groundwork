import { describe, it, expect } from 'vitest'
import { peersVisibilitySentence } from './CheckInPeopleAndSetup'

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
 *
 * WALKTHROUGH PASS 2, ITEM 1: that sentence, read by the lead about her own check-in, named a
 * manager of hers that this page was never about - `peersVisibilitySentence` now takes `isInitiator`
 * and drops "including your manager" only for her; a participant's wording (reached on a different
 * page) is untouched.
 */
describe('the "Each other\'s check-ins" switch says a true sentence in every position', () => {
  const base = { peersVisible: false, peersVisibleToEachOther: false, peersDefaultHidden: false, isInitiator: false }

  it('no longer claims nobody sees another person\'s answers', () => {
    expect(peersVisibilitySentence(base)).not.toMatch(/Nobody sees another person's answers/)
  })

  it('carries the settled true sentence about who can see what you say, to a participant', () => {
    expect(peersVisibilitySentence({ ...base, peersVisible: true })).toContain('The people in this check-in, including your manager, can see what you say in it')
    expect(peersVisibilitySentence({ ...base, peersVisibleToEachOther: null })).toContain('The people in this check-in, including your manager, can see what you say in it')
    expect(peersVisibilitySentence(base)).toContain('The people in this check-in, including your manager, can see what you say in it')
  })

  it('says what the switch actually controls: naming, not whether content is shared', () => {
    expect(peersVisibilitySentence({ ...base, peersVisible: true })).toContain('You are named to each other.')
    expect(peersVisibilitySentence(base)).toContain('You are not named to each other.')
  })

  it('drops "including your manager" for the lead, reading about her own check-in', () => {
    const toTheLead = peersVisibilitySentence({ ...base, isInitiator: true })
    expect(toTheLead).not.toContain('including your manager')
    expect(toTheLead).toContain('The people in this check-in can see what you say in it')
  })
})
