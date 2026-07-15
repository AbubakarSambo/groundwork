import { describe, it, expect } from 'vitest'
import { composeLeadBrief } from './EntryChatPage'

/**
 * Coordinator/lead path: the coordinator has no session transcript, so the
 * composed onboarding context IS the only context the lead's ground inherits.
 * Pin that every gathered field makes it into the brief and that empty
 * selections compose to an empty string (commit sends undefined, not junk).
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
    expect(brief).toContain('What this ground is for: Q3 checkout rebuild')
    expect(brief).toContain('Who is part of this: Priya (lead), Dana (engineer)')
    expect(brief).toContain('Why now: ownership is unclear')
    expect(brief).toContain('Goals: clear scope, one owner')
    expect(brief).toContain('Focus: watch the deadline')
  })

  it('omits missing fields without leaving separators behind', () => {
    const brief = composeLeadBrief({ initial: 'A new project' })
    expect(brief).toBe('What this ground is for: A new project')
  })

  it('composes empty selections to an empty string', () => {
    expect(composeLeadBrief({})).toBe('')
  })
})
