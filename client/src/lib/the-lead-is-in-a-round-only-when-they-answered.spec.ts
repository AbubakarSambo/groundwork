import { describe, it, expect } from 'vitest'
import { whoIsInRound } from './who-is-in-this-round'

/** Decision 133: the lead is in a round's numbers only when they answered it, never counted as missing. */
const people = [
  { id: 'p-wairimu', partyType: 'INITIATOR' },
  { id: 'p-brian', partyType: 'PARTICIPANT' },
  { id: 'p-aisha', partyType: 'PARTICIPANT' },
]

describe('who is in a round, with the rows in hand', () => {
  it('leaves Wairimu, the lead, out of round 3 when she did not check in, so the count reads "of two"', () => {
    expect(whoIsInRound(people, 3, 'GOAL_ALIGNMENT', [{ participantId: 'p-brian', sessionNumber: 3, status: 'COMPLETED' }]).map((p) => p.id)).toEqual(['p-brian', 'p-aisha'])
  })
  it('counts her in round 3 when she checked in that round', () => {
    expect(whoIsInRound(people, 3, 'GOAL_ALIGNMENT', [{ participantId: 'p-wairimu', sessionNumber: 3, status: 'COMPLETED' }]).map((p) => p.id)).toEqual(['p-wairimu', 'p-brian', 'p-aisha'])
  })
  it('never counts the anchor\'s managing lead, whose set-up is not an answer', () => {
    expect(whoIsInRound([{ id: 'p-grace', partyType: 'INITIATOR', managingOnly: true }, { id: 'p-amani' }], 1, 'HELP_TEAM_UNDERSTAND', [{ participantId: 'p-grace', sessionNumber: 1, status: 'COMPLETED' }]).map((p) => p.id)).toEqual(['p-amani'])
  })
})
