import { describe, it, expect } from 'vitest'
import { buildSessionRows } from './session-rows'
import { checkedIn } from '@/components/gw/TheReportIsAListOfSessions'
import { aServedCount } from './a-served-count-for-a-spec'

/**
 * NIGHT QUALITY RUN 1, PROBLEM 4. Esther's report tab read "Session 1, Mon 12 Oct, 5 of 5 checked in" and "Session 2, 4 of 4
 * checked in". Jared Okoth missed both: the clock closed his sessions with nothing said (closedReason 'auto_closed', no turn
 * of his), and the count took them as answers. Session 1 was dated by Esther's own optional row, finished on 12 October in
 * setup, though the team's round opened on 19 October. These are the run's own rows.
 */
describe('a missed check-in stays in the count, and the lead\'s own row never dates the round', () => {
  const participants = [
    { id: 'p-esther', userId: 'u-esther', partyType: 'INITIATOR', name: 'Esther Awuor', managingOnly: false },
    { id: 'p-collins', userId: 'u-collins', partyType: 'RESPONDENT', name: 'Collins Odhiambo', managingOnly: false },
    { id: 'p-hassan', userId: 'u-hassan', partyType: 'RESPONDENT', name: 'Hassan Mwenda', managingOnly: false },
    { id: 'p-amina', userId: 'u-amina', partyType: 'RESPONDENT', name: 'Amina Otieno', managingOnly: false },
    { id: 'p-jared', userId: 'u-jared', partyType: 'RESPONDENT', name: 'Jared Okoth', managingOnly: false },
  ]
  const answered = (id: string, pid: string, n: number, at: string) => ({ id, participantId: pid, sessionNumber: n, status: 'COMPLETED', isSetup: false, completedAt: at, availableFrom: '2026-10-19T00:00:00.000Z', closedReason: null, optional: false, turns: [{ id: `t-${id}` }] })
  const checkIns = [
    { ...answered('c-e1', 'p-esther', 1, '2026-10-12T00:49:47.248Z'), optional: true },
    answered('c-c1', 'p-collins', 1, '2026-10-19T07:34:00.552Z'),
    answered('c-h1', 'p-hassan', 1, '2026-10-19T08:02:31.068Z'),
    answered('c-a1', 'p-amina', 1, '2026-10-19T08:32:54.389Z'),
    { ...answered('c-j1', 'p-jared', 1, '2026-10-23T16:30:00.021Z'), closedReason: 'auto_closed', turns: [] },
    answered('c-c2', 'p-collins', 2, '2026-10-26T07:34:04.449Z'),
    answered('c-h2', 'p-hassan', 2, '2026-10-26T08:03:36.596Z'),
    answered('c-a2', 'p-amina', 2, '2026-10-26T08:34:07.292Z'),
    { ...answered('c-j2', 'p-jared', 2, '2026-10-30T16:30:00.020Z'), closedReason: 'auto_closed', turns: [] },
  ]
  const rows = buildSessionRows({ participants, checkIns, roundCompletions: [{ sessionNumber: 1 }, { sessionNumber: 2 }], scenario: 'SALES_TEAM_CHECK',
    /* As the server counts these rows: Jared's quiet closes are not answers; Esther is in session 1, which she answered, not session 2. */
    answeredBySession: aServedCount({ 1: { on: ['p-esther', 'p-collins', 'p-hassan', 'p-amina', 'p-jared'], answered: ['p-esther', 'p-collins', 'p-hassan', 'p-amina'] }, 2: { on: ['p-collins', 'p-hassan', 'p-amina', 'p-jared'], answered: ['p-collins', 'p-hassan', 'p-amina'] } }) }, 'u-esther', (p) => p.name)
  const row = (n: number) => rows.find((r) => r.sessionNumber === n)!

  it('session 1 reads 4 of 5 and names Jared, and is dated the team\'s first day, 19 October', () => {
    expect(checkedIn(row(1).answered, row(1).total)).toBe('4 of 5 checked in')
    expect(row(1).waitingOn).toEqual(['Jared Okoth'])
    expect(row(1).opened?.slice(0, 10)).toBe('2026-10-19')
  })

  it('session 2, where Esther did not check in, reads 3 of 4 and names Jared', () => {
    expect(checkedIn(row(2).answered, row(2).total)).toBe('3 of 4 checked in')
    expect(row(2).waitingOn).toEqual(['Jared Okoth'])
  })
})
