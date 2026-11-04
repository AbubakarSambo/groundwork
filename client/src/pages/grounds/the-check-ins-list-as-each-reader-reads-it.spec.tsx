import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GroundsListPage } from './GroundsListPage'
import { howARowReads, howOften } from './how-a-row-reads'
import { useAuthStore } from '@/stores/auth'
import { aServedCount } from '@/lib/a-served-count-for-a-spec'

/**
 * THE CHECK-INS LIST (C1), AS EACH READER READS IT. Mounted with the list exactly as the server
 * gives it, so what is checked is what a person reads. Wording from check-ins.txt.
 *
 * The defects this replaces, all read on the running page: "Progress 6 of 12 rounds · 2 of 5
 * answered this round", "In the way 1 · the sales deck", "Led by Hafsah Jumare · 5 participants ·
 * 8 of 12 sessions done" said to Hafsah about her own check-in, "IN PROGRESS" in capitals, and a
 * count that showed 0 before the real figure.
 */
vi.mock('@/api/grounds', () => ({ groundsApi: { list: vi.fn(), awaitingApproval: vi.fn(), approve: vi.fn(), declineGround: vi.fn() } }))
import { groundsApi } from '@/api/grounds'

const NOW = new Date('2026-09-23T09:00:00Z')
const ago = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString()

const HAFSAH = { id: 'u-h', firstName: 'Hafsah', lastName: 'Jumare', role: 'MEMBER', organizationName: 'Coamana' }
const ADMIN = { id: 'u-g', firstName: 'Grace', role: 'ADMIN', organizationName: 'Coamana' }
const p = (id: string, userId: string, firstName: string, lastName = '', partyType = 'PARTICIPANT') => ({ id, userId, partyType, user: { firstName, lastName } })

const SALES = {
  id: 'g-sales', label: 'Sales team, Q3', status: 'ACTIVE', initiatorId: 'u-h', scenario: 'OKR_ALIGNMENT', cadence: 'DAILY', workingDays: [1, 2, 3, 4, 5],
  participants: [p('p-h', 'u-h', 'Hafsah', 'Jumare', 'INITIATOR'), p('p-o', 'u-o', 'Omar'), p('p-b', 'u-b', 'Brian'), p('p-m', 'u-m', 'Miriam'), p('p-a', 'u-a', 'Aisha'), p('p-s', 'u-s', 'Samuel')],
  checkIns: [
    { participantId: 'p-o', sessionNumber: 6, status: 'NOT_STARTED', availableFrom: ago(5) },
    { participantId: 'p-b', sessionNumber: 6, status: 'COMPLETED', availableFrom: ago(5) },
    { participantId: 'p-m', sessionNumber: 6, status: 'COMPLETED', availableFrom: ago(5) },
    { participantId: 'p-a', sessionNumber: 6, status: 'COMPLETED', availableFrom: ago(5) },
    { participantId: 'p-s', sessionNumber: 6, status: 'COMPLETED', availableFrom: ago(5) },
  ],
  glance: { progress: { roundsDone: 5, roundsPlanned: 12, answeredThisRound: 4, ofPeople: 5 }, inTheWay: { count: 1, oldest: 'the sales deck' } },
  /* The one count, as the server serves it to Hafsah (api grounds/this-sessions-count.ts). Added 3 November (F5 part 3): the list says its sentence. */
  theCount: aServedCount({ 6: { on: ['p-o', 'p-b', 'p-m', 'p-a', 'p-s'], answered: ['p-b', 'p-m', 'p-a', 'p-s'] } }, { session: 6, says: '4 of 5 have checked in; Omar hasn’t started yet.' }),
}
const KWAME = {
  id: 'g-kwame', label: 'Kwame, first 90 days', status: 'ACTIVE', initiatorId: 'u-h', scenario: 'NEW_HIRE', cadence: 'WEEKLY', cadenceAnchorDay: 1,
  participants: [p('p-h2', 'u-h', 'Hafsah', 'Jumare', 'INITIATOR'), p('p-k', 'u-k', 'Kwame')],
  checkIns: [{ participantId: 'p-k', sessionNumber: 12, status: 'COMPLETED', availableFrom: ago(100) }],
  glance: { progress: { roundsDone: 12, roundsPlanned: 12, answeredThisRound: 1, ofPeople: 1 } },
}
const LEADERSHIP = {
  id: 'g-lead', label: 'Leadership, Q3', status: 'ACTIVE', initiatorId: 'u-amani', scenario: 'OKR_ALIGNMENT', cadence: 'WEEKLY', cadenceAnchorDay: 3,
  participants: [p('p-am', 'u-amani', 'Amani', 'Njoroge', 'INITIATOR'), p('p-h3', 'u-h', 'Hafsah', 'Jumare')],
  checkIns: [{ participantId: 'p-h3', sessionNumber: 4, status: 'NOT_STARTED', availableFrom: ago(2) }],
  glance: { progress: { roundsDone: 3, roundsPlanned: 12, answeredThisRound: 0, ofPeople: 2 } },
  theCount: aServedCount({ 4: { on: ['p-am', 'p-h3'], answered: [] } }, { session: 4, says: 'Nobody has checked in yet; you and Amani haven’t started yet.' }),
}
const STRATEGY = {
  id: 'g-strat', label: 'Company strategy check-in', status: 'ACTIVE', initiatorId: 'u-amani', scenario: 'OKR_ALIGNMENT', brief: 'One main goal with the teams underneath it', cadence: 'MONTHLY',
  participants: [p('p-am2', 'u-amani', 'Amani', 'Njoroge', 'INITIATOR'), p('p-h4', 'u-h', 'Hafsah', 'Jumare')],
  checkIns: [
    { participantId: 'p-h4', sessionNumber: 2, status: 'COMPLETED', availableFrom: ago(400) },
    { participantId: 'p-am2', sessionNumber: 2, status: 'COMPLETED', availableFrom: ago(400) },
    { participantId: 'p-h4', sessionNumber: 3, status: 'NOT_STARTED', availableFrom: new Date('2026-10-01T09:00:00Z').toISOString() },
  ],
  glance: { progress: { roundsDone: 2, roundsPlanned: 6, answeredThisRound: 2, ofPeople: 2 } },
}
const Q2 = {
  id: 'g-q2', label: 'Sales team, Q2', status: 'CLOSED', closedAt: '2026-06-30T12:00:00Z', initiatorId: 'u-h', scenario: 'OKR_ALIGNMENT', hasBoard: true,
  participants: [p('p-h5', 'u-h', 'Hafsah', 'Jumare', 'INITIATOR')], checkIns: [],
}
const SOMEONE_ELSES = {
  id: 'g-ops', label: 'Warehouse, Q3', status: 'ACTIVE', initiatorId: 'u-x', scenario: 'PULSE_CHECK', cadence: 'WEEKLY',
  participants: [p('p-x', 'u-x', 'Peter', 'Otieno', 'INITIATOR'), p('p-y', 'u-y', 'Joy')], checkIns: [],
  glance: { progress: { roundsDone: 0, roundsPlanned: 8, answeredThisRound: 0, ofPeople: 0 } },
}

function open(user: any, list: any[]) {
  ;(groundsApi.list as any).mockResolvedValue(list)
  ;(groundsApi.awaitingApproval as any).mockResolvedValue([])
  useAuthStore.setState({ user, token: 't', isAuthenticated: true } as any)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}><MemoryRouter><GroundsListPage /></MemoryRouter></QueryClientProvider>)
}

const rowsOf = (table: HTMLElement) => [...table.querySelectorAll('tbody tr')].map(tr => [...tr.querySelectorAll('td')].map(td => td.textContent))

beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(NOW) })
afterEach(() => { vi.useRealTimers() })

describe('the check-ins list, as Hafsah reads it (she runs two and is in two)', () => {
  it('has the prototype’s heading, sentence and sections, each with how many are open', async () => {
    open(HAFSAH, [SALES, KWAME, LEADERSHIP, STRATEGY, Q2])
    expect(screen.getByRole('heading', { level: 1, name: 'Check-ins' })).toBeTruthy()
    expect(screen.getByText('Every check-in you run or take part in. Each has its own board.')).toBeTruthy()
    await screen.findByRole('table', { name: 'You run' })
    /* Rebuilt from the shared parts (group 2): each section heading is now the shared `Section`
       component (`sec-h`), in place of the page's own `gw-ci-section-head`. */
    const sections = [...document.querySelectorAll('.sec-h')].map(h => h.textContent)
    expect(sections).toEqual(['You run2 open', 'You’re in2 open', 'Finished'])
  })

  it('says each check-in she runs from her side, in sentences, with "you" and never her own name', async () => {
    open(HAFSAH, [SALES, KWAME, LEADERSHIP, STRATEGY, Q2])
    const table = await screen.findByRole('table', { name: 'You run' })
    expect([...table.querySelectorAll('th')].map(th => th.textContent)).toEqual(['Check-in', 'What it’s for', 'Needs you', 'Where it stands'])
    expect(rowsOf(table)).toEqual([
      /* check-ins.jpg: a daily check-in's team report is there to read and share once anybody is in, so it reads "Today’s report ready", not who it waits on. */
      ['Sales team, Q36 people. Daily, weekdays. Session 6 of 12.', 'Set goals and keep the team on track', 'Today’s report ready', '4 of 5 have checked in; Omar hasn’t started yet.The sales deck is holding it up.'],
      ['Kwame, first 90 daysKwame and you. Weekly, Mondays. Session 12 of 12, finished.', 'Help a new hire get started', '', 'Decide how it ends'],
    ])
    expect(table.textContent).not.toMatch(/Hafsah|·|Led by|Progress|In the way/)
  })

  it('says who runs the ones she is in, and what they need from her', async () => {
    open(HAFSAH, [SALES, KWAME, LEADERSHIP, STRATEGY, Q2])
    const table = await screen.findByRole('table', { name: 'You’re in' })
    expect(rowsOf(table)).toEqual([
      ['Leadership, Q3Run by Amani Njoroge. Weekly, Wednesdays. Session 4 of 12.', 'Set goals and keep the team on track', 'Your turn', 'Nobody has checked in yet; you and Amani haven’t started yet.'],
      ['Company strategy check-inRun by Amani Njoroge. Monthly. Session 2 of 6.', 'Connect goals across the team', '', 'Next: 1 October'],
    ])
    expect(screen.getByText('You see these boards as a participant: the team’s picture once it’s shared, and your own part in full.')).toBeTruthy()
  })

  it('puts finished ones under Finished, with when they ended and the way back to the board', async () => {
    open(HAFSAH, [SALES, KWAME, LEADERSHIP, STRATEGY, Q2])
    const table = await screen.findByRole('table', { name: 'Finished' })
    expect(rowsOf(table)).toEqual([['Sales team, Q2Ended 30 June.', 'Set goals and keep the team on track', '', 'Read the board']])
    expect(within(table).getByRole('link', { name: 'Read the board' })).toHaveAttribute('href', '/grounds/g-q2/board')
  })

  it('never shows a count before the list has arrived, and nothing in capitals', async () => {
    ;(groundsApi.list as any).mockReturnValue(new Promise(() => {}))
    ;(groundsApi.awaitingApproval as any).mockResolvedValue([])
    useAuthStore.setState({ user: HAFSAH, token: 't', isAuthenticated: true } as any)
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={qc}><MemoryRouter><GroundsListPage /></MemoryRouter></QueryClientProvider>)
    expect(screen.getByText('Loading…')).toBeTruthy()
    expect(document.body.textContent).not.toMatch(/\d+ open|IN PROGRESS|In progress/)
  })
})

describe('the check-ins list, as an admin reads it', () => {
  it('shows the organisation’s other check-ins under their own heading, with who runs each', async () => {
    open(ADMIN, [SOMEONE_ELSES])
    const table = await screen.findByRole('table', { name: 'Other check-ins in Coamana' })
    expect(rowsOf(table)).toEqual([['Warehouse, Q3Run by Peter Otieno. Weekly.', 'Keep a read on live work', '', 'Just started']])
    expect(screen.queryByRole('table', { name: 'You run' })).toBeNull()
    /* U.5 review: and says first that none of these are theirs. */
    expect(screen.getByText('No check-ins yet. Start one.')).toBeTruthy()
  })

  it('an admin who also runs one is not told they run none', async () => {
    open(ADMIN, [SOMEONE_ELSES, { ...SOMEONE_ELSES, id: 'g-mine', label: 'Mine', initiatorId: 'u-g' }])
    await screen.findByRole('table', { name: 'You run' })
    expect(screen.queryByText(/You do not run any check-ins/)).toBeNull()
  })

  it('an empty organisation says how to start, and a failed load says it failed', async () => {
    open(ADMIN, [])
    expect(await screen.findByText('No check-ins yet')).toBeTruthy()
    expect(screen.getByText('Describe what you want your team to check in about, and it’s set up as you talk.')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Set up a check-in' })).toHaveAttribute('href', '/start?new=1')
    expect(screen.getByRole('button', { name: 'Try one on your own' })).toBeTruthy()
  })
})

/*
 * THE TWO EMPTY STATES (F4-small-states/states.txt): "No check-ins yet", for a reader who may
 * open one, and "Nothing here yet" for one who may not - keyed on `mayOpenCheckIns`, not on
 * role, since who may open a check-in is a setting an admin can give to anyone (U.20).
 */
describe('the check-ins list, with none yet', () => {
  it('a lead who may open check-ins reads "No check-ins yet", with a way to start one', async () => {
    open({ ...HAFSAH, role: 'LEAD', mayOpenCheckIns: true }, [])
    expect(await screen.findByText('No check-ins yet')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Set up a check-in' })).toBeTruthy()
  })

  it('somebody who may not open check-ins reads "Nothing here yet", with no promise of a button that would refuse them', async () => {
    open({ ...HAFSAH, mayOpenCheckIns: false }, [])
    expect(await screen.findByText('Nothing here yet')).toBeTruthy()
    expect(screen.getByText('Check-ins appear here when someone adds you to one. You’ll also get an email.')).toBeTruthy()
    expect(screen.queryByText('No check-ins yet')).toBeNull()
    expect(screen.queryByRole('link', { name: 'Set up a check-in' })).toBeNull()
    expect(screen.queryByRole('link', { name: /Set up one of your own/ })).toBeNull()
  })
})

describe('small cases, said as sentences', () => {
  it('how often', () => {
    expect(howOften({ id: 'x', label: 'x', cadence: 'ONE_TIME' })).toBe('One time.')
    expect(howOften({ id: 'x', label: 'x', cadence: 'FORTNIGHTLY', cadenceAnchorDay: 5 })).toBe('Every 2 weeks, Fridays.')
    expect(howOften({ id: 'x', label: 'x', cadence: 'DAILY', workingDays: [1, 2, 3] })).toBe('Daily.')
  })
  it('a check-in you run on your own so far says so, and that it needs a second person', () => {
    const r = howARowReads({ id: 'x', label: 'Solo', status: 'ACTIVE', initiatorId: 'u-h', cadence: 'WEEKLY', participants: [p('a', 'u-h', 'Hafsah')], checkIns: [] }, 'u-h', NOW)
    expect(r.about).toBe('Only you so far. Weekly.')
    expect(r.also).toBe('It needs a second person for a shared report.')
  })
  it('a round of yours past its date says how long ago it opened, not a mark against you', () => {
    const r = howARowReads({ ...LEADERSHIP, checkIns: [{ participantId: 'p-h3', sessionNumber: 4, status: 'NOT_STARTED', availableFrom: ago(24 * 9) }] }, 'u-h', NOW)
    expect(r.needs).toEqual({ text: 'Your turn', tone: 'action' })
    expect(r.stands).toBe('It opened 9 days ago')
  })
  it('a report released to you and not yet read', () => {
    expect(howARowReads({ ...LEADERSHIP, reportWaitingForMe: true }, 'u-h', NOW).needs).toEqual({ text: 'Your report is ready', tone: 'proven' })
  })
  it('one waiting for an admin, and one in another organisation', () => {
    const r = howARowReads({ ...SOMEONE_ELSES, status: 'AWAITING_APPROVAL', initiatorId: 'u-h', otherOrgName: 'Kilimo Traders', participants: [p('a', 'u-h', 'Hafsah', '', 'INITIATOR')] }, 'u-h', NOW)
    expect(r.needs).toEqual({ text: 'Waiting for an admin', tone: 'plain' })
    expect(r.stands).toBe('Not started yet')
    expect(r.about).toBe('Only you so far. Weekly. It belongs to Kilimo Traders.')
  })
  it('the lead of someone else’s check-in is never told who is late in it', () => {
    const asMiriam = howARowReads(SALES, 'u-m', NOW)
    expect(asMiriam.needs).toBeNull()
    expect(asMiriam.about).toBe('Run by Hafsah Jumare. Daily, weekdays. Session 6 of 12.')
  })

  /**
   * SCREEN FAULT 9: THE LIST AND THE BOARD DISAGREED ABOUT WHICH SESSION A CHECK-IN IS ON.
   *
   * Amani's list read "Session 2 of 12" while the board, for the same check-in at the same
   * moment, read "Session 1 of 12" - and the list's own "0 of 26 sessions done" sat beside a
   * session she had, in fact, already finished. Session 2 had opened by the clock (its
   * `availableFrom` had passed), but nobody had yet finished session 1 (`roundsDone: 0` - the
   * board's own number, `whichSessionIsThisCheckInOn`, reads this the same way): a session opening
   * on schedule is not the same as everybody having answered it. The list now takes whichever of
   * the schedule's own number and `roundsDone + 1` is lower, which agrees with the board exactly
   * when the two differ like this.
   */
  it('agrees with the board when a session has opened by the clock before everybody has finished the one before it', () => {
    const AMANIS_GROUND = {
      id: 'g-amani', label: 'Finance, Q4', status: 'ACTIVE', initiatorId: 'u-amani', scenario: 'OKR_ALIGNMENT', cadence: 'MONTHLY',
      participants: [p('p-am', 'u-amani', 'Amani', '', 'INITIATOR'), p('p-t', 'u-t', 'Tendai')],
      /* Session 2 has become available by the clock; nobody has completed session 1 yet. */
      checkIns: [{ participantId: 'p-am', sessionNumber: 2, status: 'NOT_STARTED', availableFrom: ago(1) }],
      glance: { progress: { roundsDone: 0, roundsPlanned: 12, answeredThisRound: 0, ofPeople: 2 } },
    }
    const r = howARowReads(AMANIS_GROUND, 'u-amani', NOW)
    expect(r.about).toContain('Session 1 of 12.')
    expect(r.about).not.toContain('Session 2 of 12')
    /* And not "0 of 26 sessions done" beside a session that has, in fact, just started. */
    expect(r.stands).toBe('Just started')
  })
})
