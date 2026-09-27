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

  /* Request 36: `roleAsDescribed` is mostly the lead's own private sentence about the person, so it
     is never a label. It used to be ("Head of Design"), and "Daniel - Your sales manager, who you
     said is not meeting his agreed targets" came out as "Daniel". */
  it('never uses the described role, even when there is no name', () => {
    expect(participantLabel({ user: null, roleAsDescribed: 'Head of Design' })).toBe('a colleague')
    const leak = participantLabel({ roleAsDescribed: 'Daniel - Your sales manager, who you said is not meeting his agreed targets' })
    expect(leak).toBe('a colleague')
    expect(leak).not.toMatch(/Daniel|sales manager|targets/)
  })

  it('uses the name typed at the end of an open link', () => {
    expect(participantLabel({ nameGiven: 'Tunde', roleAsDescribed: 'Head of Design' })).toBe('Tunde')
  })

  it('a lead with no name is "the lead"', () => {
    expect(participantLabel({ partyType: 'INITIATOR', roleAsDescribed: 'Runs sales' })).toBe('the lead')
  })

  /* "a teammate" became "a colleague": Hafsah's decision and the engine's shared wording
     (plainWordsForTheUnnameable). The prototype never says "teammate". */
  it('falls back to a neutral human phrase, not "a participant" / a role word', () => {
    const out = participantLabel(null)
    expect(out).toBe('a colleague')
    expect(out.toLowerCase()).not.toContain('teammate')
    expect(out.toLowerCase()).not.toContain('participant')
    expect(out.toLowerCase()).not.toBe('admin')
  })
})
