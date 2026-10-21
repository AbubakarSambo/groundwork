import { it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage } from './BoardPage'
import { boardApi } from '@/api/board'
import { groundsApi } from '@/api/grounds'

/**
 * A SALES CHECK-IN OF MANY PEOPLE IN TEAMS, AS THE HEAD OF SALES WHO RUNS IT READS IT (salesorg-board.jpg, screen
 * match 16 October): where each target stands, what keeps coming up about each person's work and who has not been
 * told a target under "What needs you", every sale in one table with what shows it, and the work by team.
 */
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: { id: 'u-lead', firstName: 'Lead', role: 'LEAD' } }) }))
vi.mock('@/api/board', () => ({ boardApi: { get: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn(), list: vi.fn().mockResolvedValue([]) } }))
vi.mock('@/api/today', () => ({ todayApi: { get: vi.fn().mockResolvedValue({ count: 0, line: null, comingUp: [], needs: [] }) } }))
vi.mock('@/components/gw/TheOtherBoardsYouAreIn', () => ({ TheOtherBoardsYouAreIn: () => null }))

const reps = Array.from({ length: 12 }, (_, i) => ({ id: `p-${i}`, name: `Rep${i} Surname`, partyType: 'PARTICIPANT' }))

it('draws each target, what needs the lead, every sale and the work by team', async () => {
  ;(boardApi.get as any).mockResolvedValue({
    groundId: 'g-so', renders: true, mode: 'SHARED', family: 'DELIVERY', sections: [], title: 'Sales org, Q3', scenario: 'OKR_ALIGNMENT', kindOfWork: 'sales org',
    myParticipantId: 'p-lead', canEditFrame: true, readOnlyNote: null,
    participants: [{ id: 'p-lead', name: 'Lilian Chebet', partyType: 'INITIATOR', managingOnly: true }, ...reps],
    headline: { question: 'Will we reach 100 sales by 30 September?', answer: 'So far it is 87 of the 100 sales.' },
    objectives: [{ id: 'o1', name: 'The team is aiming for 100 sales.', count: 87, target: 100, stands: { word: null } }],
    workRecords: [{ section: 'Deal grid', holds: 'deals', state: 'filled', stages: ['Qualified', 'Won'], groups: [], rows: [
      { id: 'd1', kind: 'deal', name: 'Gikomba Cold Store', owner: 'Rep1 Surname', ownerParticipantId: 'p-1', stage: 'Qualified', mark: 'proven', next: 'Rep1 Surname committed to get a buying date.', contactHistory: [] },
    ] }],
    patterns: [{ id: 'k1', participantId: 'p-2', yours: false, whatHappened: 'Visits without the shop’s name, for 2 weeks in a row.' }],
    leadActions: [{ id: 'tell-p-3', says: 'You need to talk Rep3 Surname through a goal you set for this work.' }, { id: 'tell-p-4', says: 'You need to talk Rep4 Surname through a goal you set for this work.' }],
    byArea: { state: 'filled', heading: 'By team', areas: [{ area: 'Westlands', records: 2, says: 'Westlands has 2 deals on record.' }, { area: 'Kisumu', records: 1, says: 'Kisumu has 1 deal on record.' }] },
  })
  ;(groundsApi.get as any).mockResolvedValue({ initiatorId: 'u-lead', leadFirstName: 'Lilian', cadence: 'DAILY', workingDays: [1, 2, 3, 4, 5], participants: [], checkIns: [], roundCompletions: [], contextItems: [] })
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds/g-so/board']}>
        <Routes><Route path="/grounds/:id/board" element={<BoardPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  expect(await screen.findByText('Where each target stands')).toBeTruthy()
  expect(screen.getByText('87 of 100')).toBeTruthy()
  expect(screen.getByText('Rep2: visits without the shop’s name, for 2 weeks in a row')).toBeTruthy()
  expect(screen.getByText('2 people have not been told their target')).toBeTruthy()
  expect(screen.getByText('They are Rep3 and Rep4. This comes from the targets.')).toBeTruthy()
  expect(screen.getByText('Every sale, and what shows it')).toBeTruthy()
  expect(screen.getAllByText('Gikomba Cold Store').length).toBeGreaterThan(0)
  expect(screen.getByText('A document backs it')).toBeTruthy()
  expect(screen.getByText('By team')).toBeTruthy()
  expect(screen.getByText('Westlands has 2 deals on record.')).toBeTruthy()
})

it('draws an engineering release the same way, with every task and what shows it (eng-board.jpg)', async () => {
  ;(boardApi.get as any).mockResolvedValue({
    groundId: 'g-eng', renders: true, mode: 'SHARED', family: 'DELIVERY', sections: [], title: 'Engineering release', scenario: 'NEW_PROJECT', kindOfWork: 'engineering release',
    myParticipantId: 'p-lead', canEditFrame: true, readOnlyNote: null,
    participants: [{ id: 'p-lead', name: 'Joseph Kariuki', partyType: 'INITIATOR', managingOnly: true }, { id: 'p-a', name: 'Aisha Juma', partyType: 'PARTICIPANT' }],
    objectives: [{ id: 'o1', name: 'The team is aiming for 100 tasks done.', count: 96, target: 100, stands: { word: null } }],
    workRecords: [{ section: 'Deal grid', holds: 'releases and tasks', state: 'filled', stages: ['Worked on', 'Tested'], rows: [
      { id: 't1', kind: 'task', name: 'Payment integration', owner: 'Aisha Juma', ownerParticipantId: 'p-a', stage: 'Tested', mark: 'said', next: 'Aisha Juma committed to link the test run.', contactHistory: [] },
    ] }],
    byArea: { state: 'filled', heading: 'By area', areas: [{ area: 'Payments', records: 1, says: 'Payments has 1 task on record.' }] },
    reportedAgainstCriteria: { state: 'not-known', why: 'Nothing on record says what a task must show at each stage.', stages: [{ stage: 'Tested', reported: 1, withProof: 0, says: '' }] },
  })
  ;(groundsApi.get as any).mockResolvedValue({ initiatorId: 'u-lead', leadFirstName: 'Joseph', cadence: 'DAILY', workingDays: [1, 2, 3, 4, 5], participants: [], checkIns: [], roundCompletions: [], contextItems: [] })
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds/g-eng/board']}>
        <Routes><Route path="/grounds/:id/board" element={<BoardPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  expect(await screen.findByText('Every task, and what shows it')).toBeTruthy()
  expect(screen.getByText('Task')).toBeTruthy()
  expect(screen.getByText('Owner')).toBeTruthy()
  expect(screen.getByText('Reported vs evidence, stage by stage')).toBeTruthy()
  expect(screen.getByText('By area of work')).toBeTruthy()
})

it('draws a support desk the same way, with every ticket and where the helpdesk numbers would go (support-board.jpg)', async () => {
  ;(boardApi.get as any).mockResolvedValue({
    groundId: 'g-sup', renders: true, mode: 'SHARED', family: 'DELIVERY', sections: [], title: 'Support desk', scenario: 'OKR_ALIGNMENT', kindOfWork: 'support desk',
    myParticipantId: 'p-lead', canEditFrame: true, readOnlyNote: null,
    participants: [{ id: 'p-lead', name: 'Esther Njeri', partyType: 'INITIATOR', managingOnly: true }, { id: 'p-t', name: 'Tom Otieno', partyType: 'PARTICIPANT' }],
    workRecords: [
      { section: 'Deal grid', holds: 'tickets', state: 'filled', rows: [{ id: 't1', kind: 'ticket', name: '#4790, Password reset loop', owner: 'Tom Otieno', ownerParticipantId: 'p-t', stage: 'Reopened', mark: 'proven', nextSays: 'Nobody has said what happens next.', contactHistory: [] }] },
      { section: 'Themes', holds: 'ticket volume and causes from the helpdesk', state: 'not-known', why: 'Groundwork does not keep this yet. It needs the ticket counts from the helpdesk itself.' },
    ],
  })
  ;(groundsApi.get as any).mockResolvedValue({ initiatorId: 'u-lead', leadFirstName: 'Esther', cadence: 'DAILY', workingDays: [1, 2, 3, 4, 5], participants: [], checkIns: [], roundCompletions: [], contextItems: [] })
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds/g-sup/board']}>
        <Routes><Route path="/grounds/:id/board" element={<BoardPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  expect(await screen.findByText('Every ticket, and what shows it')).toBeTruthy()
  expect(screen.getByText('Agent')).toBeTruthy()
  expect(screen.getByText('Volume from the helpdesk, causes from the check-ins')).toBeTruthy()
  expect(screen.getByText('Groundwork does not keep this yet. It needs the ticket counts from the helpdesk itself.')).toBeTruthy()
})

it('draws a training programme the same way, with every trader group and the work by county (programme-board.jpg)', async () => {
  ;(boardApi.get as any).mockResolvedValue({
    groundId: 'g-prog', renders: true, mode: 'SHARED', family: 'COHORT', sections: [], title: 'Trader training programme', scenario: 'COHORT_CHECK', kindOfWork: 'trader training programme',
    myParticipantId: 'p-lead', canEditFrame: true, readOnlyNote: null,
    participants: [{ id: 'p-lead', name: 'Lucy Wanjala', partyType: 'INITIATOR', managingOnly: true }, { id: 'p-k', name: 'Kevin Otieno', partyType: 'PARTICIPANT' }],
    workRecords: [{ section: 'Deal grid', holds: 'trader groups', state: 'filled', stages: ['Enrolled', 'Session 1'], rows: [{ id: 'g1', kind: 'group', name: 'Kibera youth vendors', owner: 'Kevin Otieno', ownerParticipantId: 'p-k', stage: 'Enrolled', mark: 'proven', nextSays: 'Nobody has said what happens next.', contactHistory: [] }] }],
    byArea: { state: 'filled', heading: 'By county', areas: [{ area: 'Nairobi', records: 1, says: 'Nairobi has 1 group on record.' }] },
    reportedAgainstCriteria: { state: 'not-known', why: 'Nothing on record says what a group must show at each stage.', stages: [{ stage: 'Enrolled', reported: 1, withProof: 1, says: '' }] },
  })
  ;(groundsApi.get as any).mockResolvedValue({ initiatorId: 'u-lead', leadFirstName: 'Lucy', cadence: 'DAILY', workingDays: [1, 2, 3, 4, 5], participants: [], checkIns: [], roundCompletions: [], contextItems: [] })
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds/g-prog/board']}>
        <Routes><Route path="/grounds/:id/board" element={<BoardPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  expect(await screen.findByText('Every trader, and what shows it')).toBeTruthy()
  expect(screen.getByText('Officer')).toBeTruthy()
  expect(screen.getByText('Drop-off by session')).toBeTruthy()
  expect(screen.getByText('By county')).toBeTruthy()
  expect(screen.getByRole('link', { name: 'See every other part of this board' })).toBeTruthy()
})

it('draws a founder’s own check-in with every item, no row per person, and the reader as "You" (founder-board.jpg)', async () => {
  ;(boardApi.get as any).mockResolvedValue({
    groundId: 'g-f', renders: true, mode: 'SHARED', family: 'RECURRING', sections: [], title: 'Founder’s own check-in', scenario: 'PULSE_CHECK', kindOfWork: "founder's own check-in",
    myParticipantId: 'p-lead', canEditFrame: true, readOnlyNote: null,
    participants: [{ id: 'p-lead', name: 'Victor Odhiambo', partyType: 'INITIATOR', managingOnly: false }],
    eachPersonToday: [{ participantId: 'p-lead', who: 'You', line: 'You have checked in.' }],
    workRecords: [{ section: 'Work plan', holds: 'commitments and decisions', state: 'filled', rows: [
      { id: 'i1', kind: 'commitment', name: 'Board update', owner: 'Victor Odhiambo', ownerParticipantId: 'p-lead', stage: 'Done', mark: 'proven', nextSays: 'Nobody has said what happens next.', contactHistory: [] },
      { id: 'i2', kind: 'commitment', name: 'send the board update', owner: 'Victor Odhiambo', ownerParticipantId: 'p-lead', stage: null, mark: 'said', contactHistory: [] },
    ] }],
  })
  ;(groundsApi.get as any).mockResolvedValue({ initiatorId: 'u-lead', leadFirstName: 'Victor', cadence: 'WEEKLY', cadenceAnchorDay: 1, participants: [], checkIns: [], roundCompletions: [], contextItems: [] })
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds/g-f/board']}>
        <Routes><Route path="/grounds/:id/board" element={<BoardPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  expect(await screen.findByText('Every item, and what shows it')).toBeTruthy()
  expect(screen.getByText('You')).toBeTruthy()
  expect(screen.queryByText('send the board update')).toBeNull()
  expect(screen.queryByText('The team today')).toBeNull()
})

it('draws a lending cohort with where it stands, every trader, and what keeps coming up as the cohort’s own question (loans-board.jpg)', async () => {
  ;(boardApi.get as any).mockResolvedValue({
    groundId: 'g-l', renders: true, mode: 'SHARED', family: 'COHORT', sections: [], title: 'Asset loans, cohort 3', scenario: 'COHORT_CHECK', kindOfWork: 'asset loans',
    myParticipantId: 'p-lead', canEditFrame: true, readOnlyNote: null,
    participants: [{ id: 'p-lead', name: 'Mercy Chepkoech', partyType: 'INITIATOR', managingOnly: true }, { id: 'p-m', name: 'Musa Abdi', partyType: 'PARTICIPANT' }],
    workRecords: [{ section: 'Deal grid', holds: 'loans and their repayments', state: 'filled', stages: ['Repaying', 'Late'], rows: [{ id: 'l1', kind: 'loan', name: 'Musa’s freezer loan', owner: 'Musa Abdi', ownerParticipantId: 'p-m', stage: 'Late', mark: 'said', nextSays: 'Nobody has said what happens next.', contactHistory: [] }] }],
    patterns: [{ id: 'k1', participantId: 'p-m', yours: false, whatHappened: 'Repayment falls before market day, for 4 weeks in a row.' }],
    whereTheCohortStands: { heading: 'Where the cohort stands', says: '1 person is in this cohort.', groups: [{ group: 'behind', count: 1, says: 'The loan records show 1 loan behind on repayment.', who: ['Musa Abdi'] }] },
    supportGiven: { heading: 'Support given, and whether it helped', state: 'not-known', why: 'Nothing on record says what support each person was given, or whether it helped, so this cannot be shown yet.' },
  })
  ;(groundsApi.get as any).mockResolvedValue({ initiatorId: 'u-lead', leadFirstName: 'Mercy', cadence: 'WEEKLY', cadenceAnchorDay: 1, participants: [], checkIns: [], roundCompletions: [], contextItems: [] })
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds/g-l/board']}>
        <Routes><Route path="/grounds/:id/board" element={<BoardPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  expect(await screen.findByText('Where the cohort stands')).toBeTruthy()
  expect(screen.getByText('The loan records show 1 loan behind on repayment.')).toBeTruthy()
  expect(screen.getByText('Every trader, and what shows it')).toBeTruthy()
  expect(screen.getByText('One person, a place, or the model?')).toBeTruthy()
  expect(screen.getByText('Support given, and whether it helped')).toBeTruthy()
  expect(screen.getByRole('link', { name: 'See every other part of this board' })).toBeTruthy()
})

it('the cohort board says "yours to judge" to whoever runs it, and not to a trader in the cohort (browser test, 20 October)', async () => {
  const cohort = (canEditFrame: boolean) => ({
    groundId: 'g-l', renders: true, mode: 'SHARED', family: 'COHORT', sections: [], title: 'Asset loans, cohort 3', scenario: 'COHORT_CHECK', kindOfWork: 'asset loans',
    myParticipantId: canEditFrame ? 'p-lead' : 'p-m', canEditFrame, readOnlyNote: null,
    participants: [{ id: 'p-lead', name: 'Mercy Chepkoech', partyType: 'INITIATOR', managingOnly: true }, { id: 'p-m', name: 'Musa Abdi', partyType: 'PARTICIPANT' }],
    workRecords: [], patterns: [],
    whereTheCohortStands: { heading: 'Where the cohort stands', says: '1 person is in this cohort.', groups: [] },
  })
  for (const [canEditFrame, shown] of [[true, true], [false, false]] as const) {
    ;(boardApi.get as any).mockResolvedValue(cohort(canEditFrame))
    ;(groundsApi.get as any).mockResolvedValue({ initiatorId: 'u-lead', leadFirstName: 'Mercy', cadence: 'WEEKLY', cadenceAnchorDay: 1, participants: [], checkIns: [], roundCompletions: [], contextItems: [] })
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { unmount } = render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/grounds/g-l/board']}>
          <Routes><Route path="/grounds/:id/board" element={<BoardPage />} /></Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(await screen.findByText('One person, a place, or the model?')).toBeTruthy()
    expect(!!screen.queryByText(/is yours to judge/)).toBe(shown)
    unmount()
  }
})

it('draws people asked once with the report in short, each group, what they named, where they disagree and who has not answered (mvnext-board.jpg)', async () => {
  ;(boardApi.get as any).mockResolvedValue({
    groundId: 'g-mv', renders: true, mode: 'SHARED', family: 'SNAPSHOT', sections: [], title: 'MarketView, where next', scenario: 'DISCOVERY', kindOfWork: 'MarketView where next',
    myParticipantId: 'p-lead', canEditFrame: true, readOnlyNote: null,
    participants: [{ id: 'p-lead', name: 'Amina Bello', partyType: 'INITIATOR', managingOnly: true }, { id: 'p-a', name: 'Ade Adeyemi', role: 'Agroprocessor' }, { id: 'p-v', name: 'Victoria Oyelaran', role: 'Research organisation' }],
    checkInGrid: { sessions: [1], rows: [{ participantId: 'p-a', name: 'Ade Adeyemi', role: 'Agroprocessor', cells: { 1: 'done' } }, { participantId: 'p-v', name: 'Victoria Oyelaran', role: 'Research organisation', cells: { 1: 'empty' } }] },
    workRecords: [{ section: 'Themes', holds: 'priorities people named', state: 'filled', rows: [{ id: 't1', kind: 'priority', name: 'Kano, then Kaduna', owner: 'Ade Adeyemi', fields: { theme: 'Markets and regions' } }] }],
    divergence: { items: [{ topic: 'daily or monthly prices', positions: [{ who: 'Ade Adeyemi', view: 'Daily prices or it’s no use to us.' }, { who: 'Victoria Oyelaran', view: 'We need consistent monthly series.' }] }] },
    byWhoTheyAre: { heading: 'By who they are', state: 'filled', note: 'What each group said it needs', groups: [{ group: 'Agroprocessor', count: 1, answered: 1, says: '1 person, 1 answered.' }, { group: 'Research organisation', count: 1, answered: 0, says: '1 person, 0 answered.' }] },
    whereTheyDisagree: { heading: 'Where they disagree', state: 'filled', items: [{ topic: 'daily or monthly prices', positions: [{ who: 'Ade Adeyemi', view: 'Daily prices or it’s no use to us.' }, { who: 'Victoria Oyelaran', view: 'We need consistent monthly series.' }] }] },
  })
  ;(groundsApi.get as any).mockResolvedValue({ initiatorId: 'u-lead', leadFirstName: 'Amina', cadence: 'ONE_TIME', participants: [], checkIns: [], roundCompletions: [], contextItems: [] })
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds/g-mv/board']}>
        <Routes><Route path="/grounds/:id/board" element={<BoardPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  expect(await screen.findByText('In short')).toBeTruthy()
  expect(screen.getByText('1 of 2 answered, each on their own, once.')).toBeTruthy()
  expect(screen.getByText('By who they are')).toBeTruthy()
  expect(screen.getByText('Markets and regions')).toBeTruthy()
  expect(screen.getByText('1 person, 0 answered.')).toBeTruthy()
  expect(screen.getByText(/Daily prices or it’s no use to us/)).toBeTruthy()
  expect(screen.getByText('Victoria has not answered, so what they would say is not here. And what people said they would do was said, not tested.')).toBeTruthy()
})

it('draws numbers from the systems beside what people said (mvq4-board.jpg)', async () => {
  ;(boardApi.get as any).mockResolvedValue({
    groundId: 'g-q4', renders: true, mode: 'SHARED', family: 'DELIVERY', sections: [], title: 'MarketView, Q4', scenario: 'OKR_ALIGNMENT', kindOfWork: 'MarketView Q4',
    myParticipantId: 'p-lead', canEditFrame: true, readOnlyNote: null,
    participants: [{ id: 'p-lead', name: 'Tunde Akande', partyType: 'INITIATOR', managingOnly: true }],
    headline: { question: 'Will MarketView reach 40 paying subscribers by 31 December?', answer: 'So far it is 31 of the 40 paying subscribers.' },
    objectives: [{ id: 'o1', name: 'The team is aiming for 40 paying subscribers.', count: 31, target: 40 }],
    whatTheSystemsShow: { heading: 'What the systems show', state: 'filled', numbers: [{ key: 'paid', source: 'Paystack', value: 31, unit: null, measuredAt: '2026-09-23', says: 'Paystack shows 31 for paid subscriptions this quarter, as of 23 September.' }], whatANumberIsNot: ['These came from your own systems.'] },
    whereWhatWasSaidAndTheSystemsDiffer: { heading: 'Where what people said and the systems differ', state: 'filled', rows: [{ id: 'r1', participantId: 'p-i', said: 'Ife Okon said, "I closed three new subscriptions this week."', documentSays: 'A document on this check-in says it differently. It says, "Two paid, one invoice open."' }] },
  })
  ;(groundsApi.get as any).mockResolvedValue({ initiatorId: 'u-lead', leadFirstName: 'Tunde', cadence: 'DAILY', workingDays: [1, 2, 3, 4, 5], participants: [], checkIns: [], roundCompletions: [], contextItems: [] })
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds/g-q4/board']}>
        <Routes><Route path="/grounds/:id/board" element={<BoardPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  expect(await screen.findByText('So far it is 31 of the 40 paying subscribers.')).toBeTruthy()
  expect(screen.queryByText('Where each target stands')).toBeNull()
  expect(screen.getByText('What the systems show')).toBeTruthy()
  expect(screen.getByText('Paystack shows 31 for paid subscriptions this quarter, as of 23 September.')).toBeTruthy()
  expect(screen.getByText('Where what people said and the systems differ')).toBeTruthy()
})

it('draws a law firm matter with where it stands, what you need to decide and what changed this week (matter-board.jpg)', async () => {
  ;(boardApi.get as any).mockResolvedValue({
    groundId: 'g-m', renders: true, mode: 'SHARED', family: 'RECURRING', sections: [], title: 'Kasarani Foods v Pwani Mills', scenario: 'PULSE_CHECK', kindOfWork: 'a law firm matter',
    myParticipantId: 'p-lead', canEditFrame: true, readOnlyNote: null,
    participants: [{ id: 'p-lead', name: 'Njeri Mwangi', partyType: 'INITIATOR', managingOnly: true }],
    whereTheMatterStands: { heading: 'Where the matter stands', state: 'filled', says: ['Our reply is due on 2 October.'] },
    whatYouNeedToDecide: { heading: 'What you need to decide', state: 'filled', items: [{ question: 'Decide whether to argue the limitation point first', why: 'You wrote this down as still to decide.', owner: 'You' }] },
    whatChangedThisWeek: { heading: 'What changed this week, and what it changed', state: 'filled', sessionNumber: 4, says: 'In session 4, 1 thing was said about the matter.', lines: [{ id: 'l1', participantId: 'p-l', text: 'Leila Hassan said, "My research found the defence was filed late."', mark: 'said', markSays: 'Only someone’s word' }], cannotTell: 'Nothing on record links each change to what it changed.' },
  })
  ;(groundsApi.get as any).mockResolvedValue({ initiatorId: 'u-lead', leadFirstName: 'Njeri', cadence: 'WEEKLY', cadenceAnchorDay: 1, participants: [], checkIns: [], roundCompletions: [], contextItems: [] })
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds/g-m/board']}>
        <Routes><Route path="/grounds/:id/board" element={<BoardPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  expect(await screen.findByText('Where the matter stands')).toBeTruthy()
  expect(screen.getByText('Our reply is due on 2 October.')).toBeTruthy()
  expect(screen.getByText('What you need to decide')).toBeTruthy()
  expect(screen.getByText('What changed this week, and what it changed')).toBeTruthy()
  expect(screen.getByText('Leila Hassan said, "My research found the defence was filed late."')).toBeTruthy()
})

it('draws a government programme with what each level understood, the visit log and the counties (gov-board.jpg)', async () => {
  ;(boardApi.get as any).mockResolvedValue({
    groundId: 'g-gov', renders: true, mode: 'SHARED', family: 'RECURRING', sections: [], title: 'Extension Access Programme', scenario: 'PULSE_CHECK', kindOfWork: 'a government programme',
    myParticipantId: 'p-lead', canEditFrame: true, readOnlyNote: null,
    participants: [{ id: 'p-lead', name: 'Joseph Kamau', partyType: 'INITIATOR', managingOnly: true }],
    whatEachLevelUnderstood: { heading: 'What each level understood', state: 'filled', levels: [{ participantId: 'p-r', who: 'Ruth Otieno', said: ['Ruth Otieno said, "30% more farmers get advice."'] }], note: 'Groundwork does not keep which level each person works at.' },
    whatTheVisitLogShows: { heading: 'What the visit log shows', state: 'not-known', why: 'No numbers from another system are on record yet.' },
    theCounties: { heading: 'The three counties', state: 'filled', counties: [{ id: 'c1', name: 'Kiambu', projects: [], says: 'Kiambu has no project on record yet.' }] },
  })
  ;(groundsApi.get as any).mockResolvedValue({ initiatorId: 'u-lead', leadFirstName: 'Joseph', cadence: 'WEEKLY', cadenceAnchorDay: 1, participants: [], checkIns: [], roundCompletions: [], contextItems: [] })
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds/g-gov/board']}>
        <Routes><Route path="/grounds/:id/board" element={<BoardPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  expect(await screen.findByText('What each level understood')).toBeTruthy()
  expect(screen.getByText('What the visit log shows')).toBeTruthy()
  expect(screen.getByText('The three counties')).toBeTruthy()
  expect(screen.getByText('Kiambu has no project on record yet.')).toBeTruthy()
})
