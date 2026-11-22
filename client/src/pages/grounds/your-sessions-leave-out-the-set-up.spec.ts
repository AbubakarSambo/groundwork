import { describe, it, expect } from 'vitest'
import { yourSessionsSentence } from './CheckInPeopleAndSetup'

/**
 * Screens item c: the set-up conversation is not a session, so day one reads "0 of 4", not "1 of 4". The count itself is the server's
 * now (api grounds/the-sessions-done.spec.ts proves the set-up row and a corrected session are never counted twice); the screen only
 * says the number it is given, and never more than were planned.
 */
describe("the lead's own sessions, as said", () => {
  it('on day one, with only the set-up done, are none', () => {
    expect(yourSessionsSentence(0, 4)).toBe('You have not checked in for any of the 4 sessions yet.')
  })
  it('say one real session once, and never more than were planned', () => {
    expect(yourSessionsSentence(1, 4)).toBe('You have checked in for 1 of the 4 sessions.')
    expect(yourSessionsSentence(9, 6)).toBe('You have checked in for 6 of the 6 sessions.')
  })
})
