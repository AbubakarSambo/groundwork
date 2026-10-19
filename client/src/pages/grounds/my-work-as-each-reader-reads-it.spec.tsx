import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MyWorkPage } from './MyWorkPage'
import { groundsApi } from '@/api/grounds'
import { YourWork } from '@/components/gw/checkin/YourWork'
import { ContextPage } from '@/components/gw/ContextPage'

/**
 * MY WORK, AS EACH READER READS IT (Release 1B, pull request 3 of 3). The sales check-in of the B7 pictures, "Sales team, Q4" at
 * Drop Access, rendered from what the server serves each reader (the payloads are the server's, word for word, as
 * api/src/modules/board/my-work-as-each-reader-is-served-it.spec.ts proves them):
 *  - Mercy reads her own page, in the second person, the seven behaviours with the library's words, and her own reports;
 *  - Grace reads Mercy's page with Mercy's name, chooses whose work to read, reads her own note for Mercy, and none of Mercy's
 *    own reports;
 *  - with the switch off, today's My work and today's Context page are drawn exactly as before.
 */
vi.mock('@/api/grounds', async () => {
  const actual = await vi.importActual<typeof import('@/api/grounds')>('@/api/grounds')
  return {
    ...actual,
    groundsApi: {
      ...actual.groundsApi,
      myWork: vi.fn(),
      myTranscript: vi.fn().mockResolvedValue({ sessions: [] }),
      myDeliveries: vi.fn().mockResolvedValue([]),
      setMySoloReportShared: vi.fn(),
      readAPlan: vi.fn(),
      planCardsWaiting: vi.fn().mockResolvedValue({ proposals: [] }),
    },
  }
})
vi.mock('@/api/documents', () => ({ documentsApi: { list: vi.fn().mockResolvedValue([]), upload: vi.fn() } }))
vi.mock('@/api/reports', () => ({ reportsApi: { againstSuccess: vi.fn().mockResolvedValue(null) } }))
vi.mock('@/api/board', () => ({ boardApi: { updateObjective: vi.fn() } }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), message: vi.fn() } }))
vi.mock('@/components/gw/ContextChat', () => ({ ContextChat: () => null }))
vi.mock('@/components/gw/EachPerson', () => ({ EachPerson: () => <div>Each person’s card</div> }))
vi.mock('@/components/gw/DeliveredPanel', () => ({ DeliveredPanel: () => null }))

const LIB = {
  promises: 'Doing what you said builds trust fast.',
  planningNeeds: 'Work without a booked next step stalls.',
  planningImprove: 'Book the next step, with a day, before you finish each piece of work.',
  blockersNeeds: 'Raising blockers without trying to clear them can look like excuses.',
  blockersImprove: 'Try one thing before you raise a blocker, and say what you tried.',
  rightNeeds: 'Time spent on the wrong work is taken from the right work.',
  rightImprove: 'Check each piece of work fits the plan before you spend time on it, and let go of what isn’t moving.',
  proof: 'Proof makes your work easy to trust.',
  help: 'Helping teammates is what strong team players do.',
  quality: 'Specific, on-time check-ins make your work visible.',
}
const behaviours = (who: 'You' | 'Mercy') => {
  const your = who === 'You' ? 'your' : 'Mercy’s'
  const Your = who === 'You' ? 'Your' : 'Mercy’s'
  return [
    { key: 'keeping-promises', name: 'Keeping promises', verdict: 'Strength', happened: `${who} kept 8 of 9 promises.`, means: LIB.promises, toImprove: null, basedOn: `${Your} check-ins` },
    { key: 'planning-ahead', name: 'Planning ahead', verdict: 'Needs work', happened: `3 of ${your} 5 open deals have no next step with a day.`, means: LIB.planningNeeds, toImprove: LIB.planningImprove, basedOn: `${Your} deals today` },
    { key: 'handling-blockers', name: 'Handling blockers', verdict: 'Needs work', happened: `${who} raised 4 blockers and said what ${who === 'You' ? 'you' : 'Mercy'} had tried first on 1 of them. 3 of them are cleared now.`, means: LIB.blockersNeeds, toImprove: LIB.blockersImprove, basedOn: '4 blockers raised between 2 and 15 October' },
    { key: 'working-on-the-right-things', name: 'Working on the right things', verdict: 'Needs work', happened: `Westgate Deli has not answered since 2 October, and ${who === 'You' ? 'you are' : 'Mercy is'} still following it up.`, means: LIB.rightNeeds, toImprove: LIB.rightImprove, basedOn: `${Your} check-ins about Westgate Deli` },
    { key: 'backing-claims-with-proof', name: 'Backing claims with proof', verdict: 'Strength', happened: `3 of ${your} 4 sales have proof.`, means: LIB.proof, toImprove: null, basedOn: `${Your} deals` },
    { key: 'helping-your-team', name: 'Helping your team', verdict: 'Strength', happened: `Joseph mentioned ${your} help in 2 check-ins.`, means: LIB.help, toImprove: null, basedOn: 'Joseph’s check-ins' },
    { key: 'check-in-quality', name: 'Check-in quality', verdict: 'Strength', happened: `${who} did 10 of 10 check-ins on time. 9 of 10 were specific.`, means: LIB.quality, toImprove: null, basedOn: '10 check-ins' },
  ]
}
const LIBRARY_NOTE = 'What each behaviour means and how to improve come from the behaviour and pattern library, so the words are the same in every check-in.'
const ROWS = [
  { id: 'w-mama', name: 'Mama Mboga Mart', stage: 'Pitched', next: 'Send the quote today', nextBooked: true, proof: 'A visit photo', proven: false },
  { id: 'w-westgate', name: 'Westgate Deli', stage: 'Contacted', next: 'Nothing booked', nextBooked: false, proof: 'None yet', proven: false },
  { id: 'w-greenfield', name: 'Greenfield Hardware', stage: 'Won', next: 'Delivery on 23 October', nextBooked: true, proof: 'A signed order', proven: true },
]
const SERVED_TO_MERCY = {
  on: true, view: 'self', checkInName: 'Sales team, Q4',
  person: { participantId: 'p-mercy', name: 'Mercy Wairimu', firstName: 'Mercy' },
  heading: 'Mercy’s work',
  topLine: 'What you need to do, what you’ve done, and how to get better. Grace sees this page too.',
  numbers: [{ value: '4', label: 'sold, 3 with proof' }, { value: '4 of 40', label: 'your target' }, { value: '8 of 9', label: 'promises kept' }],
  focus: { line: LIB.planningImprove, why: '3 of your 5 open deals have no next step with a day.' },
  focusEmpty: 'Nothing needs work yet. Your focus will show here once your check-ins show something to work on.',
  toDo: {
    othersNeed: [
      { id: 'w-joseph', text: 'Joseph is waiting on you for the Kiambu route notes.', when: 'Since 14 October' },
      { id: 'w-grace', text: 'Grace is waiting on you for the name of who decides at Ruiru Academy.', when: 'By Monday' },
    ],
    own: [
      { id: 'k-westgate', text: 'Book a follow-up with Westgate Deli', when: 'It was due on 16 October.', done: false, late: true, whose: null },
      { id: 'k-quote', text: 'Send Mama Mboga Mart the quote, with a photo', when: 'Today', done: false, late: false, whose: null },
      { id: 'k-greenfield', text: 'Visit Greenfield to take the order', when: 'Done on 13 October.', done: true, late: false, whose: null },
    ],
    emptySays: 'Nothing to do yet. What you say you will do in a check-in shows here.',
  },
  achieved: {
    items: [
      { text: 'Greenfield Hardware was won, for KES 112,500.', proof: 'A signed order' },
      { text: 'Joseph mentioned your help in 2 check-ins.', proof: 'Joseph’s check-ins' },
      { text: 'You kept 8 of 9 promises.', proof: 'Your check-ins' },
    ],
    note: 'In this check-in', emptySays: 'Nothing yet. What you finish, with its proof, shows here.',
  },
  performing: { note: 'The same seven behaviours in every check-in, read from your last 10 check-ins.', behaviours: behaviours('You'), libraryNote: LIBRARY_NOTE },
  coaching: {
    better: [
      { text: 'Book the next step before you leave each visit.', from: 'Grace’s coaching for the team' },
      { text: 'The same problem is raised again and never fixed.', from: 'From your pattern' },
    ],
    keep: ['Doing what you say you’ll do.', 'Adding proof when you say something is done.', 'Helping your teammates.', 'Specific, on-time check-ins.'],
    betterEmpty: '', keepEmpty: '',
  },
  checkIns: { heading: 'Your check-ins', due: 10, done: 10, onTime: 10, specific: 9, emptySays: null },
  reports: { heading: 'Your reports', items: [{ checkInId: 'c-mercy-10', when: 'Wednesday 14 October', line: '“Greenfield signed the order today.”' }], emptySays: 'Your own report for each check-in will show here once you finish one.' },
  items: { heading: 'Your deals', note: '5 open', itemWord: 'deal', rows: ROWS, emptySays: 'You have no deals on the board yet.' },
}
const SERVED_TO_GRACE = {
  ...SERVED_TO_MERCY,
  view: 'lead',
  people: [{ participantId: 'p-mercy', name: 'Mercy Wairimu' }, { participantId: 'p-kevin', name: 'Kevin Omondi' }],
  topLine: 'What Mercy needs to do, what Mercy has done, and how Mercy can get better. Mercy sees this page too.',
  numbers: [{ value: '4', label: 'sold, 3 with proof' }, { value: '4 of 40', label: 'Mercy’s target' }, { value: '8 of 9', label: 'promises kept' }],
  focus: { line: LIB.planningImprove, why: '3 of Mercy’s 5 open deals have no next step with a day.' },
  toDo: { ...SERVED_TO_MERCY.toDo, othersNeed: [{ id: 'w-joseph', text: 'Joseph is waiting on Mercy for the Kiambu route notes.', when: 'Since 14 October' }] },
  performing: { note: 'The same seven behaviours in every check-in, read from Mercy’s last 10 check-ins.', behaviours: behaviours('Mercy'), libraryNote: LIBRARY_NOTE },
  coaching: {
    better: [
      { text: 'Book the next step before you leave each visit.', from: 'Your coaching for the team' },
      { text: 'Find the decision maker at each school before quoting.', from: 'Your note for Mercy' },
      { text: 'One step they could take this week is to pick the problem raised most often and agree who fixes it, and by when.', from: 'From Mercy’s pattern' },
    ],
    keep: SERVED_TO_MERCY.coaching.keep, betterEmpty: '', keepEmpty: '',
  },
  checkIns: { ...SERVED_TO_MERCY.checkIns, heading: 'Mercy’s check-ins' },
  reports: { heading: 'Mercy’s reports', items: [], emptySays: '', private: 'Mercy’s own reports are Mercy’s alone, so they are not shown here.' },
  items: { ...SERVED_TO_MERCY.items, heading: 'Mercy’s deals' },
}

const wrap = (ui: React.ReactNode) => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter>{ui}</MemoryRouter></QueryClientProvider>,
)

describe('My work, as each reader reads it', () => {
  it('Mercy reads her own page in the B7 order, with the seven behaviours in the library’s words', async () => {
    vi.mocked(groundsApi.myWork).mockResolvedValue(SERVED_TO_MERCY as any)
    wrap(<MyWorkPage groundId="g-sales" />)
    expect(await screen.findByRole('heading', { name: 'Mercy’s work' })).toBeTruthy()
    expect(screen.getByText('What you need to do, what you’ve done, and how to get better. Grace sees this page too.')).toBeTruthy()
    expect(screen.getByText('sold, 3 with proof')).toBeTruthy()
    expect(screen.getByText('your target')).toBeTruthy()
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    expect(headings).toEqual(['Mercy’s work', 'Your focus this week', 'To do', 'What you achieved', 'How you’re performing', 'Coaching', 'Your deals'])
    expect(screen.getByText('3 of your 5 open deals have no next step with a day.', { selector: '.gwui-callout *, .gwui-callout' })).toBeTruthy()
    expect(screen.getByText('Joseph is waiting on you for the Kiambu route notes.')).toBeTruthy()
    expect(screen.getByText('By Monday')).toBeTruthy()
    expect(screen.getByText('It was due on 16 October.')).toBeTruthy()
    expect(screen.getByText('Late')).toBeTruthy()
    expect(screen.getByText('Done on 13 October.')).toBeTruthy()
    expect(screen.getByText('Greenfield Hardware was won, for KES 112,500.')).toBeTruthy()
    for (const b of behaviours('You')) {
      const row = screen.getByText(b.name).closest('[data-gw-behaviour]')!.parentElement!
      expect(within(row).getByText(b.verdict)).toBeTruthy()
      expect(within(row).getByText(b.happened)).toBeTruthy()
      expect(within(row).getByText(b.means!)).toBeTruthy()
      if (b.toImprove) expect(within(row).getByText(b.toImprove)).toBeTruthy()
    }
    expect(screen.getAllByText('How to improve')).toHaveLength(3)
    expect(screen.getAllByText('Based on your check-ins.').length).toBeGreaterThan(0)
    expect(screen.getByText(LIBRARY_NOTE)).toBeTruthy()
    expect(screen.getByText('Grace’s coaching for the team')).toBeTruthy()
    expect(screen.getByText('From your pattern')).toBeTruthy()
    expect(screen.getByText('Helping your teammates.')).toBeTruthy()
    expect(screen.getAllByText('Your check-ins').length).toBeGreaterThan(1)
    expect(screen.getByText('“Greenfield signed the order today.”')).toBeTruthy()
    expect(screen.getByText('Westgate Deli')).toBeTruthy()
    expect(screen.getByText('Nothing booked')).toBeTruthy()
    expect(screen.queryByLabelText('Whose work')).toBeNull()
    expect(screen.queryByText(/Your note for/)).toBeNull()
  })

  it('Grace reads Mercy’s page with Mercy’s name, her own note for Mercy, and none of Mercy’s own reports', async () => {
    vi.mocked(groundsApi.myWork).mockResolvedValue(SERVED_TO_GRACE as any)
    wrap(<MyWorkPage groundId="g-sales" />)
    expect(await screen.findByLabelText('Whose work')).toBeTruthy()
    expect(screen.getByText('What Mercy needs to do, what Mercy has done, and how Mercy can get better. Mercy sees this page too.')).toBeTruthy()
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    expect(headings).toEqual(['Mercy’s work', 'Mercy’s focus this week', 'To do', 'What Mercy achieved', 'How Mercy is performing', 'Coaching', 'Mercy’s deals'])
    expect(screen.getByText('Asked of Mercy')).toBeTruthy()
    expect(screen.getByText('Mercy kept 8 of 9 promises.')).toBeTruthy()
    expect(screen.getByText('Your note for Mercy')).toBeTruthy()
    expect(screen.getByText('Find the decision maker at each school before quoting.')).toBeTruthy()
    expect(screen.getByText('Mercy’s own reports are Mercy’s alone, so they are not shown here.')).toBeTruthy()
    expect(screen.queryByText('“Greenfield signed the order today.”')).toBeNull()
  })

  it('what today’s page holds is drawn after the new sections', async () => {
    vi.mocked(groundsApi.myWork).mockResolvedValue(SERVED_TO_MERCY as any)
    wrap(<MyWorkPage groundId="g-sales" rest={<div>Today’s record</div>} />)
    expect(await screen.findByText('Today’s record')).toBeTruthy()
  })
})

const YOUR_WORK = {
  groundId: 'g1',
  ground: { label: 'Sales team, Q4', commitments: [{ id: 'c1', participantId: 'p1', text: 'Send Green Mart the quote', status: 'UNKNOWN' }] },
  myRecord: { insightsLocked: true, patterns: null },
  mySoloReport: { report: null, shared: false },
  refetchSoloReport: () => {},
  specificity: null, report: null, totalSessions: 12, completedCount: 1, myFinishedSessions: [], sessionDots: [],
  myParticipant: { id: 'p1', managingOnly: false, objective: { all: [] } },
  otherParties: [], aTeamReportComes: false,
}

describe('with the switch off, My work and the Context page are as before', () => {
  it('today’s My work keeps its title and what you said you’d do; under the new page those two are drawn by the new page', () => {
    const off = wrap(<YourWork {...(YOUR_WORK as any)} />)
    expect(screen.getByRole('heading', { name: 'Your work' })).toBeTruthy()
    expect(screen.getByText('What you said you’d do')).toBeTruthy()
    expect(screen.getByText('Send Green Mart the quote')).toBeTruthy()
    off.unmount()
    wrap(<YourWork {...(YOUR_WORK as any)} asTheRestOfMyWork />)
    expect(screen.queryByRole('heading', { name: 'Your work' })).toBeNull()
    expect(screen.queryByText('What you said you’d do')).toBeNull()
  })

  it('the Context page draws everything as before, and on My work only the parts that moved there', () => {
    const ground = {
      id: 'g1', contextEnabled: true, brief: 'Sell 120 dispensers.', participants: [], objectives: [], contextItems: [], leadContextNotes: [],
      commitments: [{ id: 'c1', participantId: null, text: 'Call the bursar at Ruiru', whenSaid: null, explicit: true }],
      planAsAgreed: [{ id: 't-1', what: '10 new leads a week', who: 'Everyone', when: 'Weekly' }],
    }
    const full = wrap(<ContextPage ground={ground} role="lead" viewerUserId="u-grace" />)
    expect(screen.getByText('The plan, as agreed')).toBeTruthy()
    expect(screen.getByText('What people are down as doing')).toBeTruthy()
    expect(screen.getAllByText(/Sell 120 dispensers/).length).toBeGreaterThan(0)
    full.unmount()
    wrap(<ContextPage ground={ground} role="lead" viewerUserId="u-grace" only="what-moved-to-my-work" />)
    expect(screen.getByText('The plan, as agreed')).toBeTruthy()
    expect(screen.getByText('10 new leads a week')).toBeTruthy()
    expect(screen.getByText('What people are down as doing')).toBeTruthy()
    expect(screen.getByText('Call the bursar at Ruiru')).toBeTruthy()
    expect(screen.getByText('Each person’s card')).toBeTruthy()
    expect(screen.queryByText(/Sell 120 dispensers/)).toBeNull()
  })
})

/**
 * WITH JUDGEMENTS OF A PERSON OFF FOR THE ORGANISATION (api organisation/person-judgements.ts; the payload as
 * api/src/modules/board/my-work-as-each-reader-is-served-it.spec.ts proves the server serves it): Mercy reads what happened, and none of
 * what judges her.
 */
const SERVED_TO_MERCY_WITHOUT_JUDGEMENTS = {
  ...SERVED_TO_MERCY,
  judgements: false,
  topLine: 'What you need to do and what you’ve done. Grace sees this page too.',
  focus: null,
  focusEmpty: 'This part is turned off for your organisation.',
  performing: { note: 'This part is turned off for your organisation.', behaviours: [], libraryNote: '' },
  coaching: { better: [{ text: 'Book the next step before you leave each visit.', from: 'Grace’s coaching for the team' }], keep: [], betterEmpty: 'This part is turned off for your organisation.', keepEmpty: 'This part is turned off for your organisation.' },
  checkIns: { heading: 'Your check-ins', due: 10, done: 10, onTime: 0, specific: 0, emptySays: null },
}

describe('My work, with judgements of a person off', () => {
  it('Mercy reads what happened, with no focus, no behaviours, no strengths and no on-time or specific counts', async () => {
    vi.mocked(groundsApi.myWork).mockResolvedValue(SERVED_TO_MERCY_WITHOUT_JUDGEMENTS as any)
    wrap(<MyWorkPage groundId="g-sales" />)
    expect(await screen.findByRole('heading', { name: 'Mercy’s work' })).toBeTruthy()
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    expect(headings).toEqual(['Mercy’s work', 'To do', 'What you achieved', 'How you’re performing', 'Coaching', 'Your deals'])
    expect(screen.getByText('This part is turned off for your organisation.')).toBeTruthy()
    expect(screen.getByText('Book the next step before you leave each visit.')).toBeTruthy()
    expect(screen.queryByText('Keep doing')).toBeNull()
    expect(screen.queryByText('On time')).toBeNull()
    expect(screen.queryByText('Specific')).toBeNull()
    expect(screen.queryByText(/Strength|Needs work/)).toBeNull()
    expect(screen.getByText('10 of 10')).toBeTruthy()
  })
})
