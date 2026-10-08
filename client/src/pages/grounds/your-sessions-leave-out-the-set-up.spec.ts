import { describe, it, expect } from 'vitest'
import { sessionsDoneBy, yourSessionsSentence } from './CheckInPeopleAndSetup'

/** Screens item c: the set-up conversation is not a session, so day one reads "0 of 4", not "1 of 4". */
const participants = [{ id: 'p-lead', userId: 'u-lead' }, { id: 'p-kito', userId: 'u-kito' }]
const checkIns = [
  { status: 'COMPLETED', isSetup: true, participantId: 'p-lead', sessionNumber: 0 },
  { status: 'COMPLETED', isSetup: false, participantId: 'p-kito', sessionNumber: 1 },
]
describe("the lead's own sessions", () => {
  it('on day one, with only the set-up done, are none', () => {
    expect(yourSessionsSentence(sessionsDoneBy(checkIns, participants, 'u-lead'), 4)).toBe('0 of 4 sessions are done.')
  })
  it('count a real session once, corrected or not', () => {
    const more = [...checkIns, { status: 'COMPLETED', isSetup: false, participantId: 'p-lead', sessionNumber: 1 }, { status: 'COMPLETED', isSetup: false, participantId: 'p-lead', sessionNumber: 1 }]
    expect(yourSessionsSentence(sessionsDoneBy(more, participants, 'u-lead'), 4)).toBe('1 of 4 sessions are done.')
  })
})
