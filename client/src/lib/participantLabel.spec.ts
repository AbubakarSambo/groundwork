import { describe, it, expect } from 'vitest'
import { participantLabel } from './utils'

/**
 * Bug 11 guard: when a party has no name and no described role, the display
 * fallback must be a neutral human phrase, never the bare role word. Revert
 * the fallback to 'a participant' (the role word) -> this bites.
 */
describe('BUG11: participantLabel never falls back to the bare role word', () => {
  it('uses the name when present', () => {
    expect(participantLabel({ user: { firstName: 'Jordan', lastName: 'Reyes' } })).toBe('Jordan Reyes')
  })

  it('uses the described role when there is no name', () => {
    expect(participantLabel({ user: null, roleAsDescribed: 'Head of Design' })).toBe('Head of Design')
  })

  it('falls back to a neutral human phrase, not "a participant" / a role word', () => {
    const out = participantLabel(null)
    expect(out).toBe('a teammate')
    expect(out.toLowerCase()).not.toContain('participant')
    expect(out.toLowerCase()).not.toBe('admin')
  })
})
