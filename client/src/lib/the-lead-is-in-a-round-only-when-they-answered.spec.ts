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
  /* Moved here from invited-not-joined-yet-run-3.spec.tsx (night quality run 3, decision 8 redone; changed 1 November 2026, Hafsah
     approved) when the old "Who is in this" roster it sat beside was deleted: Amina was invited and never joined, and she is still
     on the check-in, so she is in the count and named as not joined. */
  it('counts Amina, invited and not joined yet, and names her as not joined', () => {
    const run3 = [
      { id: 'p-amina', partyType: 'PARTICIPANT', notJoinedYet: true },
      { id: 'p-jared', partyType: 'PARTICIPANT' },
      { id: 'p-hassan', partyType: 'PARTICIPANT' },
    ]
    const ground = { theCount: { session: 4, said: null, bySession: { 4: { sessionNumber: 4, onTheCheckIn: ['p-amina', 'p-jared', 'p-hassan'], answered: ['p-hassan'], notYet: ['p-jared'], notJoined: ['p-amina'], declined: [], notLetIn: [] } } } }
    expect(whoTheSessionCounts(run3, ground, 4).map((p) => p.id)).toEqual(['p-amina', 'p-jared', 'p-hassan'])
    expect(theCountOf(ground, 4)?.notJoined).toEqual(['p-amina'])
  })
})
