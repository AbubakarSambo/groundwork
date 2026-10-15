import { describe, it, expect } from 'vitest'
import { composeLeadBrief } from './EntryChatPage'

/**
 * Coordinator/lead path: the coordinator has no session transcript, so the
 * composed onboarding context IS the only context the lead's ground inherits.
 * Pin that every gathered field makes it into the brief and that empty
 * selections compose to an empty string (commit sends undefined, not junk).
 *
 * THE SITUATION IS NO LONGER LABELLED, and that is the change here. It used to be prefixed "What
 * this check-in is for:" and printed directly under a band heading reading WHAT THIS CHECK-IN IS
 * FOR - the label said twice, with the person's own sentence buried behind it. Everything else
 * still travels, because on this path it is the only handover there is. See
 * a-brief-is-a-sentence-not-a-form.spec.ts for the punctuation half of the same read.
 */
describe('composeLeadBrief', () => {
  it('carries every onboarding field the coordinator gave', () => {
    const brief = composeLeadBrief({
      initial: 'Q3 checkout rebuild',
      whoInvolved: 'Priya (lead), Dana (engineer)',
      decision: 'ownership is unclear',
      goals: ['clear scope', 'one owner'],
      brief: 'watch the deadline',
    })
    expect(brief).toContain('Q3 checkout rebuild')
    /* U.7 third review: each answer, as Groundwork understood it, after the question it answered, with nobody quoted. */
    expect(brief).toContain('When asked who is part of this, the answer was taken to mean this. Priya (lead), Dana (engineer).')
    expect(brief).toContain('When asked why this matters now, the answer was taken to mean this. Ownership is unclear.')
    expect(brief).toContain('When asked what this is aiming at, the answer was taken to mean these 2 things. Clear scope. One owner.')
    expect(brief).toContain('When asked what the questions should focus on, the answer was taken to mean this. Watch the deadline.')
  })

  it('omits missing fields without leaving separators behind', () => {
    const brief = composeLeadBrief({ initial: 'A new project' })
    expect(brief).toBe('A new project.')
  })

  it('composes empty selections to an empty string', () => {
    expect(composeLeadBrief({})).toBe('')
  })
})
