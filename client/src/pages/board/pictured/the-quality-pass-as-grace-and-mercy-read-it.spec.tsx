import { it, expect, describe, vi } from 'vitest'
vi.mock('@/api/check-in-links', () => ({ checkInLinksApi: { get: vi.fn(async () => ({ waitingOnOtherTeams: [] })) } }))
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HeadlineAndGap, EveryDealDayByDay, ThePicturedOwnDeals, TheTeamToday, WhatKeepsComingUp, ReportedAgainstCriteria, Reports, OpenIssues, Blockers } from './ThePicturedSalesBoard'
import { screen } from '@testing-library/react'

/**
 * HAFSAH'S QUALITY PASS OF 18 OCTOBER, AS GRACE AND MERCY READ THE BOARD ON THE PAGE. Every served value below is what the server
 * serves on the short run's record (api: the-quality-pass-of-18-october-as-each-reader-reads-it.spec.ts).
 */
const wrap = (node: React.ReactNode) => render(<QueryClientProvider client={new QueryClient()}><MemoryRouter>{node}</MemoryRouter></QueryClientProvider>)
const text = () => (document.body.textContent ?? '').replace(/\s+/g, ' ')

describe('Q1, B-1 to B-3: the headline and its tiles', () => {
  it('Grace reads one question, the answer naming the deals, "65 sold. 40 paid, 25 on a signed order." and the new leads on their own line', () => {
    const b = {
      releaseOneSalesBoard: true,
      headline: {
        question: 'Will we reach 120 units sold by 30 October?',
        answer: 'Not yet. 65 of the 120 units are sold. 40 are paid (Kilele Hotel) and 25 are on a signed order (Greenfield Supermarket), which pays on delivery on Friday 16 October.',
        bars: [{ objectiveId: 'o-team', kind: 'aim', now: 65, target: 120, filled: 54, word: null }],
        besides: [{ objectiveId: 'o-leads', count: 6, target: 30, says: '6 new leads this week, of the 30 you asked for.' }],
      },
      objectives: [{ id: 'o-team', name: 'The team is aiming for 120 units sold by 30 October.', target: 120, count: 65, ownerParticipantId: null, fromTheDeals: { counts: 'units', sold: 65, proven: 40, shown: 25, currency: null } }],
    }
    wrap(<HeadlineAndGap b={b} deals={{ rows: [] }} groups={{}} />)
    expect(text()).toContain('Will we reach 120 units sold by 30 October?')
    expect(text()).not.toContain('and 30 new leads')
    expect(text()).toContain('which pays on delivery on Friday 16 October.')
    expect(text()).toContain('65 sold. 40 paid, 25 on a signed order.')
    expect(text()).not.toContain('with proof of payment')
    expect(text()).toContain('6 new leads this week, of the 30 you asked for.')
  })
})

/* The rows as the server serves them to Grace on the short run's record (api spec, Q3 and B-4 to B-16). */
const NOW = new Date('2026-10-18T17:09:00Z')
const SAVANNAH = { id: 's', kind: 'deal', name: 'Savannah Cafe', stage: 'Quoted', owner: 'Kevin Omondi', ownerParticipantId: 'p-kevin', fields: { Units: '6', Quoted: 'KES 30,000', Contact: 'Jane' }, value: null, valueLine: 'KES 30,000 quoted', mark: 'said', group: 'likely', next: 'Jane pays the KES 15,000 deposit on Friday 16 October.', nextStep: 'Jane pays the KES 15,000 deposit on Friday 16 October.', nextOn: '2026-10-16', lastSaidOn: '2026-10-14', contactHistory: [{ on: '2026-10-14', how: 'in their words' }], criteria: [] }
const NGONG = { id: 'n', kind: 'deal', name: 'Ngong Road Minimart', stage: 'Quoted', owner: 'Kevin Omondi', ownerParticipantId: 'p-kevin', fields: { Units: '4', Quoted: 'KES 20,000', Contact: 'Ali' }, value: null, valueLine: 'KES 20,000 quoted', mark: 'said', group: 'possible', next: 'Kevin follows up with Ali on Monday 19 October. The quote of KES 20,000 is sent.', nextStep: 'Kevin follows up with Ali on Monday 19 October. The quote of KES 20,000 is sent.', nextOn: '2026-10-19', lastSaidOn: '2026-10-14', contactHistory: [{ on: '2026-10-14', how: 'in their words' }], criteria: [] }
const JUJA = { id: 'j', kind: 'deal', name: 'Juja Hardware', stage: 'Need established', owner: 'Joseph Kariuki', ownerParticipantId: 'p-joseph', fields: { Units: 'five', Value: 'KES 22,500', 'Price each': 'KES 4,500', Contact: 'Mr Kariuki' }, value: 'KES 22,500', valueLine: '5 units, KES 22,500 if you agree KES 4,500', mark: 'said', group: 'possible', next: 'Your answer on KES 4,500 a unit, then a buying date from Mr Kariuki.', nextStep: 'Your answer on KES 4,500 a unit, then a buying date from Mr Kariuki.', lastSaidOn: '2026-10-14', contactHistory: [{ on: '2026-10-14', how: 'in their words' }], criteria: [] }
const GROUPS = [{ group: 'likely', heading: 'Likely by 30 October', reason: 'Each of these has all four criteria on record or close.', rowIds: ['s'] }, { group: 'possible', heading: 'Possible', reason: 'Each of these is moving.', rowIds: ['n', 'j'] }]
const row = (name: string) => screen.getAllByText(name)[0].closest('tr') as HTMLElement

describe('Q3, B-5, B-11 to B-13: every deal, day by day', () => {
  it('Grace reads each deal\'s value as quoted or unagreed, what it still needs and from whom, and the kit\'s "Next step booked"', () => {
    wrap(<EveryDealDayByDay b={{ participants: [], canEditFrame: false, releaseOneSalesBoard: true }} section={{ section: 'Deal grid', rows: [SAVANNAH, NGONG, JUJA], groups: GROUPS }} now={NOW} groundId="g1" />)
    expect(row('Savannah Cafe').textContent).toContain('KES 30,000 quoted')
    expect(row('Savannah Cafe').textContent).toContain('Jane pays the KES 15,000 deposit on Friday 16 October.')
    expect(row('Ngong Road Minimart').textContent).toContain('KES 20,000 quoted')
    expect(row('Ngong Road Minimart').textContent).toContain('Kevin follows up with Ali on Monday 19 October. The quote of KES 20,000 is sent.')
    expect(row('Juja Hardware').textContent).toContain('5 units, KES 22,500 if you agree KES 4,500')
    expect(row('Juja Hardware').textContent).toContain('Your answer on KES 4,500 a unit, then a buying date from Mr Kariuki.')
    /* The open table has no day-by-day dots, so the key has no "Next step booked" line; the step itself is read in its column. */
    expect(text()).not.toContain('Next step booked')
    expect(row('Savannah Cafe').textContent).toContain('Kevin')
    expect(text()).not.toContain('Send the quote, by tomorrow by noon')
  })

  it('Mercy reads Tuskys Westgate with Peter ticked as its decision maker, and Joseph\'s samples as what it still needs (R-2, R-3, R-4)', () => {
    const TUSKYS = { id: 't', kind: 'deal', name: 'Tuskys Westgate', stage: 'Contacted', owner: 'Mercy Wairimu', ownerParticipantId: 'p-mercy', fields: { Contact: 'Peter', 'Decision maker': 'Peter' }, value: null, mark: 'said', group: 'possible', next: 'Joseph\'s samples, promised for Thursday 15 October. Nothing since says they came.', nextStep: 'Joseph\'s samples, promised for Thursday 15 October. Nothing since says they came.', nextOn: '2026-10-15', lastSaidOn: '2026-10-14', contactHistory: [{ on: '2026-10-14', how: 'in their words' }], criteriaSays: 'One of the four criteria is on record. The customer\'s need, the budget the customer stated and the buying date are not on record yet.', groupSays: 'One of the four criteria is on record.', criteria: [{ criterion: 'need', label: 'Need', met: false, says: 'Not on record yet.' }, { criterion: 'budget', label: 'Budget the customer stated', met: false, says: 'Not on record yet.' }, { criterion: 'decision maker', label: 'Decision maker', met: true, says: null, value: 'Peter' }, { criterion: 'buying date', label: 'Buying date', met: false, says: 'Not on record yet.' }] }
    const MBOGA = { id: 'm', kind: 'deal', name: 'Mama Mboga Mart', stage: 'Quoted', owner: 'Mercy Wairimu', ownerParticipantId: 'p-mercy', fields: { Units: 'two', Value: 'KES 10,000', Quoted: 'KES 10,000', Contact: 'Rose' }, value: 'KES 10,000', valueLine: 'KES 10,000 quoted', mark: 'said', group: 'possible', next: 'Nothing booked. Rose has your KES 10,000 quote. Ask Rose when Mama Mboga Mart will buy.', nextStep: 'Nothing booked. Rose has your KES 10,000 quote. Ask Rose when Mama Mboga Mart will buy.', lastSaidOn: '2026-10-14', contactHistory: [], criteria: [] }
    const b = { participants: [], canEditFrame: false, releaseOneSalesBoard: true, myParticipantId: 'p-mercy', workRecords: [{ section: 'Deal grid', rows: [TUSKYS, MBOGA], groups: [{ group: 'possible', heading: 'Possible', reason: 'Each of these is moving.', rowIds: ['t', 'm'] }] }] }
    wrap(<ThePicturedOwnDeals b={b} groundId="g1" myFirstName="Mercy" />)
    expect(text()).toContain('✓ Decision maker, Peter')
    expect(row('Tuskys Westgate').textContent).toContain('Joseph\'s samples, promised for Thursday 15 October. Nothing since says they came.')
    expect(row('Mama Mboga Mart').textContent).toContain('Nothing booked. Rose has your KES 10,000 quote. Ask Rose when Mama Mboga Mart will buy.')
    /* Thursday 15 October has passed: nothing is drawn as booked for it, and the key does not say "Next step booked". */
    expect(text()).not.toContain('Next step booked')
  })
})

describe('standing decision 4, as changed on 18 October: no stall rule set', () => {
  it('Grace reads Upper Hill Offices under Possible, with no reply since 12 October and what Kevin tried, never "Stall rule reached"', () => {
    const UPPER = { id: 'u', kind: 'deal', name: 'Upper Hill Offices', stage: 'Contacted', owner: 'Kevin Omondi', ownerParticipantId: 'p-kevin', fields: { Contact: 'Paul' }, value: null, mark: 'said', group: 'possible', notAnsweringSince: '2026-10-13', noReplySince: '2026-10-12', next: 'Paul has not answered three calls from Kevin, on 13 and 14 October.', nextStep: 'Paul has not answered three calls from Kevin, on 13 and 14 October.', lastSaidOn: '2026-10-14', contactHistory: [{ on: '2026-10-14', how: 'in their words' }, { on: '2026-10-13', how: 'in their words' }, { on: '2026-10-12', how: 'in their words' }], criteria: [] }
    wrap(<EveryDealDayByDay b={{ participants: [], canEditFrame: false, releaseOneSalesBoard: true }} section={{ section: 'Deal grid', rows: [UPPER], groups: [{ group: 'possible', heading: 'Possible', reason: 'Each of these is moving.', rowIds: ['u'] }], groupsNote: ['No stall rule set yet, so no deal is marked cold for going quiet.'] }} now={NOW} groundId="g1" />)
    expect(row('Upper Hill Offices').textContent).toContain('no reply since 12 Oct')
    expect(row('Upper Hill Offices').textContent).toContain('Paul has not answered three calls from Kevin, on 13 and 14 October.')
    expect(text()).not.toContain('Stall rule reached')
    expect(text()).not.toContain('Cold')
  })
})

describe('Q5, Q6, B-21, B-22: the team today, and what keeps coming up', () => {
  const GRACE = {
    participants: [{ id: 'p-joseph', name: 'Joseph Kariuki' }, { id: 'p-mercy', name: 'Mercy Wairimu' }],
    eachPerson: [{ participantId: 'p-mercy', reason: 'has not answered' }, { participantId: 'p-joseph', reason: 'has not answered' }],
    eachPersonToday: [
      { participantId: 'p-mercy', who: 'Mercy Wairimu', line: 'On Wednesday 14 October, Mercy said, “I quoted her KES 10,000 for the two units.”', checkedInToday: false, lastIn: '14 Oct', thisWeek: 'Tuskys Westgate waits on Joseph\'s samples. Mama Mboga Mart has a quote and nothing booked.' },
      { participantId: 'p-joseph', who: 'Joseph Kariuki', line: 'On Wednesday 14 October, Joseph said, “Wanjiru said to call her next week.”', checkedInToday: false, lastIn: '14 Oct', keepsComingUp: 'The samples for Tuskys Westgate, promised three check-ins running, still not done.' },
    ],
    keepsComingUp: [{ participantId: 'p-joseph', says: 'The samples for Tuskys Westgate, promised three check-ins running, still not done.', yours: false }],
    patterns: [],
  }
  it('on Sunday Grace reads each person\'s last check-in with its day, tagged "Last in 14 Oct", never "Hasn\'t checked in today"', () => {
    wrap(<TheTeamToday b={GRACE} deals={{ rows: [] }} today="2026-10-18" groundId="g1" />)
    expect(text()).toContain('On Wednesday 14 October, Mercy said, “I quoted her KES 10,000 for the two units.”')
    expect(text()).toContain('Last in 14 Oct')
    expect(text()).not.toContain('Hasn’t checked in today')
    expect(text()).not.toContain('Not in yet')
    expect(text()).toContain('The samples for Tuskys Westgate, promised three check-ins running, still not done.')
    expect(text()).toContain('Tuskys Westgate waits on Joseph\'s samples. Mama Mboga Mart has a quote and nothing booked.')
  })
  it('What keeps coming up names Joseph\'s samples, as what happened, never "Nothing has come up three check-ins in a row yet"', () => {
    wrap(<WhatKeepsComingUp b={GRACE} />)
    expect(text()).toContain('Joseph')
    expect(text()).toContain('The samples for Tuskys Westgate, promised three check-ins running, still not done.')
    expect(text()).not.toContain('Nothing has come up three check-ins in a row yet')
  })
})

describe('B-23 to B-25: the stage counts, the reports list and open issues', () => {
  it('a stage nobody reported a deal at reads only how many meet it', () => {
    wrap(<ReportedAgainstCriteria b={{ releaseOneSalesBoard: true, reportedAgainstCriteria: { state: 'not-known', why: 'x', stages: [{ stage: 'Pitched', reported: null, met: 2, withProof: 2 }, { stage: 'Quoted', reported: 5, met: 2, withProof: 2 }] } }} />)
    expect(text()).toContain('2 met')
    expect(text()).toContain('5 said, 2 met')
    expect(text()).not.toContain('null')
  })
  it('each session row says what moved that day', () => {
    const rows = [{ sessionNumber: 3, opened: '2026-10-14T05:00:00Z', answered: 3, total: 3, shared: true }, { sessionNumber: 2, opened: '2026-10-13T05:00:00Z', answered: 3, total: 3, shared: true }]
    wrap(<Reports b={{ whatMovedEachDay: { '2026-10-14': 'Savannah Cafe said yes to 6 units.', '2026-10-13': 'Greenfield Supermarket signed for 25 units.' } }} groundId="g1" sessionRows={rows} navigate={() => {}} now={NOW} />)
    expect(text()).toContain('3 of 3 checked in. Savannah Cafe said yes to 6 units.')
    expect(text()).toContain('3 of 3 checked in. Greenfield Supermarket signed for 25 units.')
  })
  it('Open issues is not drawn when there are none, as the kit', () => {
    wrap(<OpenIssues b={{ releaseOneSalesBoard: true, openIssues: { state: 'not-known', why: 'Groundwork does not follow an issue from the day it is raised to the day it is decided and done, so there is no list of open issues here.' } }} renderActions={() => null} />)
    expect(text()).not.toContain('Open issues')
    expect(text()).not.toContain('no list of open issues')
  })
})

describe('Q4, B-17 to B-20: the blocker cards', () => {
  it('Grace reads the samples card in first names, with what was tried, what was promised and what would clear it', () => {
    const b = { myParticipantId: 'p-grace', blockers: [{ id: 'w1', fromParticipantId: 'p-mercy', onParticipantId: 'p-joseph', on: 'Joseph', name: 'the samples for Tuskys Westgate', state: 'blocking', says: 'Mercy is waiting on Joseph for the samples for Tuskys Westgate.', raised: { says: '3 times, from 12 to 14 October.' }, holdingUp: 'Tuskys Westgate. Peter can make a decision once the samples come.', timeGiven: 'Joseph said Thursday 15 October. That day has passed, and nothing since says they came.', tried: 'Mercy called Joseph on 13 October.', proof: { says: 'Nothing on record proves it. It rests on what Mercy and Joseph both said.' }, wouldClearIt: 'Joseph brings the samples to Mercy. Then Peter at Tuskys Westgate can make a decision.' }] }
    wrap(<Blockers b={b} groundId="g1" />)
    for (const said of ['Waiting on: Joseph', 'Raised: 3 times, from 12 to 14 October.', 'Affects: Tuskys Westgate. Peter can make a decision once the samples come.', 'Promised: Joseph said Thursday 15 October. That day has passed, and nothing since says they came.', 'Mercy called Joseph on 13 October.', 'What the proof shows: Nothing on record proves it. It rests on what Mercy and Joseph both said.', 'Would clear it: Joseph brings the samples to Mercy. Then Peter at Tuskys Westgate can make a decision.']) {
      expect(text()).toContain(said)
    }
    expect(text()).not.toMatch(/Joseph Kariuki|Mercy Wairimu|A document backs|Tried:/)
  })
})
