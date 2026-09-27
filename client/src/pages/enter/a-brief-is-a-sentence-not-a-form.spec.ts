import { describe, it, expect } from 'vitest'
import { composeLeadBrief } from './EntryChatPage'

/**
 * THE BRIEF EVERY PARTICIPANT READS WAS THE SETUP Q&A GLUED TOGETHER.
 *
 * Read on a real check-in, under a band heading saying WHAT THIS CHECK-IN IS FOR:
 *
 *   "What this check-in is for: I run a 40 person logistics company... before she gets buried in
 *    it.. Who is part of this: Just Nadia and me for this one... run their own check-ins
 *    separately.. Why now: ..."
 *
 * The label said twice, and two doubled full stops - the join added one to fragments that already
 * ended in a stop. Neither is visible in the code; both are the first thing on the page.
 */
describe('composing the brief', () => {
  it('leads with the situation in their own words, unlabelled', () => {
    const brief = composeLeadBrief({ initial: 'Margaret joins the sales team on the 15th.' })
    expect(brief).toBe('Margaret joins the sales team on the 15th.')
    expect(brief).not.toContain('What this check-in is for')
  })

  it('and never doubles a full stop', () => {
    const brief = composeLeadBrief({
      initial: 'She starts on the 15th.',
      whoInvolved: 'Just the two of us.',
      decision: 'Her probation is decided in March.',
      goals: ['Get the contracts filed'],
    })
    expect(brief).not.toMatch(/\.\./)
    expect(brief).not.toMatch(/\.\s*\./)
  })

  it('and punctuates a fragment that has none', () => {
    expect(composeLeadBrief({ initial: 'She starts on the 15th' })).toBe('She starts on the 15th.')
  })

  /** On the coordinator path this is the only context a lead inherits, so it all still travels. */
  it('and still carries everything the onboarding gathered', () => {
    const brief = composeLeadBrief({
      initial: 'She starts on the 15th.',
      whoInvolved: 'Nadia and me',
      decision: 'Probation in March',
      goals: ['Contracts filed', 'An onboarding pack'],
      brief: 'The hiring handover',
    })
    /* U.7 review: plain sentences, no "Label:" pieces, the person's words inside each. */
    expect(brief).toBe('She starts on the 15th. The people in it are Nadia and me. It matters now because probation in March. It is aiming at contracts filed and an onboarding pack. The questions should focus on the hiring handover.')
    expect(brief).not.toMatch(/Who is part of this:|Why now:|What it is aiming at:|Focus:/)
  })

  it('and keeps a name its capital', () => {
    expect(composeLeadBrief({ initial: 'Kwame joins the sales team.', whoInvolved: 'Kwame and Wairimu', decision: 'Kwame starts on Monday' }))
      .toBe('Kwame joins the sales team. The people in it are Kwame and Wairimu. It matters now because Kwame starts on Monday.')
  })

  it('and says nothing when there is nothing', () => {
    expect(composeLeadBrief({})).toBe('')
    expect(composeLeadBrief({ initial: '   ' })).toBe('')
  })
})
