import { describe, it, expect } from 'vitest'
import { askNameFor, aRealOrganisationName } from './ask-name'

/**
 * Release check, 9 October. A sign-up with a blank organisation name is named "Wanjiru Otieno's workspace", and the admin's card on
 * Today read "You never see anyone's questions to Ask Wanjiru Otieno's workspace" and "Get Wanjiru Otieno's workspace going". The
 * engine says "Ask Groundwork" until a real name is given; the screens now say the same.
 */
describe('a made-up workspace name is never said as the organisation', () => {
  it('names Ask "Ask Groundwork" for a made-up name', () => {
    expect(askNameFor("Wanjiru Otieno's workspace")).toBe('Ask Groundwork')
    expect(askNameFor('Wanjiru Otieno’s workspace')).toBe('Ask Groundwork')
    expect(askNameFor('My workspace')).toBe('Ask Groundwork')
    expect(askNameFor('Msingi Foods')).toBe('Ask Msingi Foods')
  })
  it('gives no organisation name for a made-up one', () => {
    expect(aRealOrganisationName("Wanjiru Otieno's workspace")).toBeNull()
    expect(aRealOrganisationName('Msingi Foods')).toBe('Msingi Foods')
  })
})
