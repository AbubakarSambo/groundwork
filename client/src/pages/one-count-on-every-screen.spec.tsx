import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { TheTeamToday } from '@/pages/board/pictured/ThePicturedSalesBoard'
import { HowItIsGoing } from '@/components/gw/how-it-is-going'
import { buildSessionRows } from '@/lib/session-rows'
import { checkedIn, stillToCheckIn } from '@/components/gw/TheReportIsAListOfSessions'
import { railAttention } from '@/lib/rail-attention'
import { howManyHaveNotAnsweredYet } from '@/lib/a-number-up-to-ten-in-words'
import { aServedCount } from '@/lib/a-served-count-for-a-spec'

/**
 * ONE SERVED COUNT, AND EVERY SCREEN A FIRST-TIME LEAD READS SAYS IT (Hafsah, 30 October 2026, first-experience round 3).
 *
 * Aisha runs a weekly sales check-in. She invited four: Sarah and David joined, Fatuma and James have not. She has checked in;
 * Sarah and David have not. She read "1 of 3 checked in" beside "0 people have answered", nothing on The team today, and Fatuma
 * and James named as "has not checked in for this session yet". Each screen counted for itself.
 *
 * Here every screen is given the one count the server serves (api grounds/this-sessions-count.ts, `thisSession`, the same object on
 * GET /grounds/:id, the board and the check-ins list) while the rows on the screen would count otherwise, and each says the same
 * session, the same "N of M" and the same people.
 */
/* Changed on wip/plan: Fatuma and James, invited and not joined, are counted (wip/assessment's one count, Hafsah, 1 November 2026),
   and said as not joined, never as somebody who has not checked in. */
const THIS_SESSION = {
  session: 1, answered: 1, ofPeople: 5, everyoneIn: false,
  waitingOn: ['p-sarah', 'p-david', 'p-fatuma', 'p-james'], notAnswered: ['p-sarah', 'p-david', 'p-fatuma', 'p-james'],
  notCountedSays: null,
  notJoinedSays: 'Two of them were invited and have not joined yet.',
  says: 'One of the five people has checked in for session 1. Two of them were invited and have not joined yet.',
}
const PEOPLE = [
  { id: 'p-aisha', userId: 'u-aisha', partyType: 'INITIATOR', user: { firstName: 'Aisha', lastName: 'Muthoni' } },
  { id: 'p-sarah', userId: 'u-sarah', partyType: 'PARTICIPANT', user: { firstName: 'Sarah', lastName: 'Chebet' } },
  { id: 'p-david', userId: 'u-david', partyType: 'PARTICIPANT', user: { firstName: 'David', lastName: 'Kariuki' } },
  { id: 'p-fatuma', userId: null, partyType: 'PARTICIPANT', notJoinedYet: true, user: null },
  { id: 'p-james', userId: null, partyType: 'PARTICIPANT', notJoinedYet: true, user: null },
]
/* Only Aisha's row is on the screen: a screen counting for itself would say "1 of 1". */
const CHECK_INS = [{ id: 'c1', participantId: 'p-aisha', sessionNumber: 1, status: 'COMPLETED', completedAt: '2026-10-31T08:40:00Z' }]
/* Who has answered each session, from the same one count, as the server serves it beside thisSession. */
const ANSWERED_BY_SESSION = aServedCount({ 1: { on: ['p-aisha', 'p-sarah', 'p-david', 'p-fatuma', 'p-james'], answered: ['p-aisha'], notJoined: ['p-fatuma', 'p-james'] } })
const GROUND = { participants: PEOPLE, checkIns: CHECK_INS, roundCompletions: [], scenario: 'SALES', thisSession: THIS_SESSION, answeredBySession: ANSWERED_BY_SESSION }

describe('one count on every screen a first-time lead reads', () => {
  it('the board\'s header says the served sentence', () => {
    const { container } = render(<HowItIsGoing glance={{ progress: { roundsDone: 0, roundsPlanned: 12, answeredThisRound: 1, ofPeople: 5, waitingOn: [] }, inTheWay: { count: 0, oldest: null, daysWaiting: null } } as any} theCountSays={THIS_SESSION.says} />)
    expect(container.textContent).toContain(THIS_SESSION.says)
    expect(container.textContent).not.toMatch(/1 of 5 people have answered/)
  })

  it('The team today opens with the served sentence', () => {
    const b = {
      thisSession: THIS_SESSION,
      eachPerson: [{ participantId: 'p-sarah', reason: 'has not answered', says: 'Sarah Chebet has not checked in for this session yet.' }],
      eachPersonToday: [{ participantId: 'p-sarah', who: 'Sarah Chebet', line: 'Sarah Chebet has not checked in for this session yet.' }],
      patterns: [],
    }
    const { container, getByTestId } = render(<MemoryRouter><TheTeamToday b={b} deals={{ rows: [] }} today="2026-10-31" groundId="g1" /></MemoryRouter>)
    expect(getByTestId('the-team-today-count').textContent).toBe(THIS_SESSION.says)
    /* Each person's line once, never twice. */
    expect(container.textContent!.split('Sarah Chebet has not checked in for this session yet.').length - 1).toBe(1)
  })

  it('the report tab\'s and the board\'s session row say the served numbers and the same people', () => {
    const [row] = buildSessionRows(GROUND as any, 'u-aisha', (p: any) => p.user?.firstName ?? 'a colleague')
    expect(checkedIn(row.answered, row.total)).toBe('1 of 5 checked in')
    expect(stillToCheckIn(row.waitingOn)).toBe('Sarah and David have not checked in yet.')
  })

  it('the sidebar and the check-in\'s waiting line say the served numbers', () => {
    const a = railAttention({ status: 'ACTIVE', ...GROUND } as any, 'u-aisha')
    expect(a).toEqual({ kind: 'waiting', done: 1, total: 5 })
    if (a.kind === 'waiting') expect(howManyHaveNotAnsweredYet(a.total - a.done, a.total)).toBe('Four of the five have not answered yet.')
  })
})
