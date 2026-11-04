import { describe, it, expect } from 'vitest'
import { railAttention } from './rail-attention'
import { aServedCount } from './a-served-count-for-a-spec'

/**
 * "ONE OF THE TWO HAS NOT ANSWERED YET" BESIDE FIVE PEOPLE (journey test, 12 October 2026).
 *
 * Stored on test bed a: Lena (the lead) answered session 1 and checked in herself again, session 2;
 * Pia, Ben and Cara were waiting for an admin to let them in; Chidi had not answered session 1. The
 * team was on session 1, but the count read Lena's own session 2, and said nothing of the three
 * waiting at the door. Here, with one more person added mid-session (Dan), the line says the team's
 * round and who it leaves out, in the words the lead reads at the top of the check-in.
 */
const NOW = new Date('2026-10-12T12:00:00Z')
const people = [
  { id: 'lena', userId: 'u-lena', partyType: 'INITIATOR' },
  { id: 'pia', userId: 'u-pia', partyType: 'PARTICIPANT', notLetInYet: true },
  { id: 'ben', userId: 'u-ben', partyType: 'PARTICIPANT', notLetInYet: true },
  { id: 'cara', userId: 'u-cara', partyType: 'PARTICIPANT', notLetInYet: true },
  { id: 'chidi', userId: null, partyType: 'PARTICIPANT' },
  { id: 'dan', userId: 'u-dan', partyType: 'PARTICIPANT' },
]
const row = (participantId: string, sessionNumber: number, status: string) => ({ participantId, sessionNumber, status })

/* Changed 3 November (F5 part 3): the lead reads the server's one sentence for the count (api grounds/this-sessions-count.ts, which
   says who is not let in); the page's own count sentence is gone. What is left here is which round the rail counts, and whom. */
function whatTheLeadReads(checkIns: ReturnType<typeof row>[], theCount: ReturnType<typeof aServedCount>) {
  return railAttention({ status: 'ACTIVE', participants: people, checkIns, scenario: 'NEW_PROJECT', theCount }, 'u-lena', NOW)
}

describe('the count at the top of the check-in, as the lead reads it', () => {
  it('counts the team\'s round and says who is not counted yet', () => {
    const checkIns = [
      row('lena', 1, 'COMPLETED'), row('lena', 2, 'COMPLETED'),
      row('pia', 1, 'NOT_STARTED'), row('ben', 1, 'NOT_STARTED'), row('cara', 1, 'NOT_STARTED'),
      row('chidi', 1, 'NOT_STARTED'), row('dan', 1, 'NOT_STARTED'),
    ]
    /* As the server counts round 1: Lena answered it; Pia, Ben and Cara are held at the door. */
    expect(whatTheLeadReads(checkIns, aServedCount({ 1: { on: ['lena', 'chidi', 'dan'], answered: ['lena'], notLetIn: ['pia', 'ben', 'cara'] } }))).toEqual({ kind: 'waiting', done: 1, total: 3 })
  })

  it('leaves the lead out of a round they did not answer, even when they answered a later one of their own', () => {
    const checkIns = [
      row('lena', 2, 'COMPLETED'),
      row('chidi', 1, 'NOT_STARTED'), row('dan', 1, 'NOT_STARTED'),
    ]
    /* As the server counts round 1: Lena did not answer it, so she is not in it. */
    expect(whatTheLeadReads(checkIns, aServedCount({ 1: { on: ['chidi', 'dan'], answered: [], notLetIn: ['pia', 'ben', 'cara'] } }))).toEqual({ kind: 'waiting', done: 0, total: 2 })
  })
})
