import { describe, it, expect } from 'vitest'
import { theCountOf, whoTheSessionCounts } from './the-one-count'

/**
 * Decision 133: the lead is in a round's numbers only when they answered it, never counted as missing. The rule is the server's
 * (api reports/how-many-have-answered.ts, checked in the-one-count-as-every-page-reads-it.spec.ts); the page reads what it served.
 */
const people = [
  { id: 'p-wairimu', partyType: 'INITIATOR' },
  { id: 'p-brian', partyType: 'PARTICIPANT' },
  { id: 'p-aisha', partyType: 'PARTICIPANT' },
]
const served = (onTheCheckIn: string[], answered: string[]) => ({
  theCount: { session: 3, said: null, bySession: { 3: { sessionNumber: 3, onTheCheckIn, answered, notYet: onTheCheckIn.filter((id) => !answered.includes(id)), notJoined: [], declined: [], notLetIn: [] } } },
})

describe('who is in a round, as the server counted it', () => {
  it('leaves Wairimu, the lead, out of round 3 when she did not check in, so the count reads "of two"', () => {
    expect(whoTheSessionCounts(people, served(['p-brian', 'p-aisha'], ['p-brian']), 3).map((p) => p.id)).toEqual(['p-brian', 'p-aisha'])
  })
  it('counts her in round 3 when she checked in that round', () => {
    expect(whoTheSessionCounts(people, served(['p-wairimu', 'p-brian', 'p-aisha'], ['p-wairimu']), 3).map((p) => p.id)).toEqual(['p-wairimu', 'p-brian', 'p-aisha'])
  })
  it('a session the server served no count for counts nobody, rather than a page guessing', () => {
    expect(whoTheSessionCounts(people, served(['p-brian'], []), 4)).toEqual([])
    expect(theCountOf({}, 1)).toBeNull()
  })
})
