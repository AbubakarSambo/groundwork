/* S18 (staging check, 4 November): how often is said in the one wording every page uses (howOftenTheTeamChecksIn); "Weekly, Mondays." was a second wording. */
import { it, expect, vi, beforeEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import RoundReportPage from './RoundReportPage'
import { groundsApi } from '@/api/grounds'
import { reportsApi } from '@/api/reports'
import { boardApi } from '@/api/board'

/**
 * THE TEAM'S REPORT FOR ONE SESSION, AS EACH READER READS IT (team-report.jpg, screen match 16 October). Wairimu, who
 * runs the check-in, reads it as pictured: who checked in, the share choices while only she can see it, how much it can
 * rely on, the picture in short, what each person did, where people see it differently, what it cannot tell and the
 * one question to answer. A person who checks in reads the report as before.
 */
let me: any = { id: 'u-w', firstName: 'Wairimu', lastName: 'Kamau', role: 'LEAD' }
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: me }) }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn() } }))
vi.mock('@/api/board', () => ({ boardApi: { get: vi.fn() } }))
vi.mock('@/api/reports', async (orig) => ({ ...(await orig() as any), reportsApi: { ...((await orig() as any).reportsApi), sessionReport: vi.fn(), sendToEveryone: vi.fn(), sharing: vi.fn(async () => ({ sessionNumber: 38, shared: false, held: false, at: '6:30pm', says: 'It is usually shared by 6:30pm. You’ll get an email when it is.' })) } }))
vi.mock('@/components/gw/TheSessionsReport', () => ({ TheSessionsReport: () => <p>The report as before.</p> }))
vi.mock('./TheReportHeader', () => ({ TheReportHeader: () => null }))

const GROUND = {
  id: 'g1', label: 'Sales team, Q3', initiatorId: 'u-w', cadence: 'DAILY', participants: [
    { id: 'p-w', userId: 'u-w', partyType: 'INITIATOR', user: { firstName: 'Wairimu' } },
    { id: 'p-s', userId: 'u-s', partyType: 'PARTICIPANT', user: { firstName: 'Samuel' } },
  ],
  checkIns: [{ participantId: 'p-s', sessionNumber: 38, completedAt: '2026-09-23T17:00:00Z' }],
}
const REPORT = {
  released: false, counting: [{ who: 'Samuel Njoroge', answered: true }, { who: 'Omar Said', answered: false }],
  confidence: { band: 'partial', saying: 'There is enough here to talk about, and not enough to settle anything.', reasons: [] },
  pictureLines: ['Three sales moved forward today.'],
  whatEachPersonSaid: [{ who: 'Samuel Njoroge', isYou: false, lines: ['I followed up the same 5 leads again.'] }],
  whereThingsStand: { openWithReasons: [{ topic: 'Mama Fresh', positions: [{ who: 'Brian Mwangi', view: 'Mama Fresh is ready.' }, { who: 'Wairimu Kamau', view: 'It is not ready.' }] }] },
  whatWentQuiet: null,
}
const BOARD = {
  phaseSpine: { sessions: [{ n: 38, opensOn: '2026-09-23T13:00:00Z' }] },
  decisions: [{ question: 'Decide whether a price range counts as a budget', why: 'You wrote this down as still to decide.', action: { choices: [{ label: 'Yes, it counts', route: { method: 'POST', path: '/grounds/g1/board/decisions/d1/answer', body: { yes: true } } }, { label: 'No', route: { method: 'POST', path: '/grounds/g1/board/decisions/d1/answer', body: { yes: false } } }] } }],
}

function renderIt() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds/g1/session/38']}>
        <Routes><Route path="/grounds/:id/session/:sessionNumber" element={<RoundReportPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  ;(groundsApi.get as any).mockResolvedValue(GROUND)
  ;(reportsApi.sessionReport as any).mockResolvedValue(REPORT)
  ;(boardApi.get as any).mockResolvedValue(BOARD)
})

it('Wairimu reads the team’s report as pictured, and may share it named or without names', async () => {
  me = { id: 'u-w', firstName: 'Wairimu', lastName: 'Kamau', role: 'LEAD' }
  renderIt()
  expect(await screen.findByText('The team’s report, Wednesday 23 September')).toBeTruthy()
  expect(screen.getByText('Check-in 38. 1 of 2 people checked in. Omar had not checked in by 6pm.')).toBeTruthy()
  expect(screen.getByText('Only you can see this until you share it')).toBeTruthy()
  expect(screen.getByText('Share without names')).toBeTruthy()
  expect(screen.getByText('Share with the team')).toBeTruthy()
  /* team-report.jpg: the reading and its sentence in one bold line beside the three bars. */
  expect(screen.getByText('How much this report can rely on: medium. There is enough here to talk about, and not enough to settle anything.')).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Yesterday' }).getAttribute('href')).toBe('/grounds/g1/session/37')
  expect(screen.getByRole('link', { name: 'This week' }).getAttribute('href')).toBe('/grounds/g1/report/week')
  expect(screen.getByText('Three sales moved forward today.')).toBeTruthy()
  expect(screen.getByText('Will do: did not say')).toBeTruthy()
  expect(screen.getByText('“It is not ready.”').closest('div')?.textContent).toContain('You')
  expect(screen.getByText('It cannot show Omar’s day, because Omar did not check in.')).toBeTruthy()
  expect(screen.getByText('Yes, it counts')).toBeTruthy()
  expect(screen.getByText('No, it doesn’t')).toBeTruthy()
  expect(screen.getByRole('link', { name: 'See every other part of this report' }).getAttribute('href')).toBe('/grounds/g1/session/38?whole=1')
})

it('Samuel, who checks in, reads that the team’s report is not shared yet, and the way to his own report', async () => {
  me = { id: 'u-s', firstName: 'Samuel', lastName: 'Njoroge', role: 'MEMBER' }
  ;(groundsApi.get as any).mockResolvedValue({ ...GROUND, checkIns: [{ id: 'c-s', participantId: 'p-s', sessionNumber: 38, completedAt: '2026-09-23T17:00:00Z' }] })
  renderIt()
  expect(await screen.findByText('The team’s report isn’t shared yet')).toBeTruthy()
  /* When it reaches him, from the server: it shares itself at its set time (Hafsah's answers 1 and 5, 16 October 2026). */
  expect(await screen.findByText('It is usually shared by 6:30pm. You’ll get an email when it is.')).toBeTruthy()
  expect(screen.getByText('Read your own report').closest('a')?.getAttribute('href')).toBe('/checkin/c-s/report')
  /* Nothing of the team's report, and not the lead's question. */
  expect(screen.queryByText('Three sales moved forward today.')).toBeNull()
  expect(screen.queryByText('Share with the team')).toBeNull()
  expect(screen.queryByText('Yes, it counts')).toBeNull()
})

it('Samuel reads the shared report as before', async () => {
  me = { id: 'u-s', firstName: 'Samuel', lastName: 'Njoroge', role: 'MEMBER' }
  ;(reportsApi.sessionReport as any).mockResolvedValue({ ...REPORT, released: true })
  renderIt()
  expect(await screen.findByText('The report as before.')).toBeTruthy()
  expect(screen.queryByText('Share with the team')).toBeNull()
})

it('Wairimu reads a shared session by its number, with no share choices left (one-session.jpg)', async () => {
  me = { id: 'u-w', firstName: 'Wairimu', lastName: 'Kamau', role: 'LEAD' }
  ;(reportsApi.sessionReport as any).mockResolvedValue({ ...REPORT, released: true })
  renderIt()
  expect(await screen.findByText('Check-in 38', { selector: 'h1' })).toBeTruthy()
  expect(screen.getByText('Shared with the team')).toBeTruthy()
  expect(screen.queryByText('Share with the team')).toBeNull()
})

/* faith90-team-report.jpg (screen 57): before anybody has checked in, the lead reads the check-in's own header and when the first report comes. */
it('Wairimu reads, before anybody has checked in, the check-in’s header with “Your check-in” and its tabs, and when the first report is written', async () => {
  me = { id: 'u-w', firstName: 'Wairimu', lastName: 'Kamau', role: 'LEAD' }
  ;(groundsApi.get as any).mockResolvedValue({ ...GROUND, label: 'Faith, first 90 days', cadence: 'WEEKLY', cadenceAnchorDay: 1, checkIns: [] })
  ;(reportsApi.sessionReport as any).mockResolvedValue({ ...REPORT, counting: [{ who: 'Faith Muthoni', answered: false }, { who: 'Wairimu Kamau', answered: false }] })
  renderIt()
  expect(await screen.findByText('The first team report')).toBeTruthy()
  expect(screen.getByText('It’s written once everyone has checked in, and only you see it until you share it.')).toBeTruthy()
  expect(screen.getByText('2 people. Every Monday.')).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Your check-in' }).getAttribute('href')).toBe('/grounds/g1')
  /* The third tab is "References and resources" for everybody since Release 1B's switch went (eb43a349d). */
  for (const tab of ['Board', 'Check-in', 'References and resources', 'My work', 'People and setup']) expect(screen.getByText(tab)).toBeTruthy()
})

/* salesorg-team-report.jpg: a sales organisation of more than ten people reads "What each person said"; one sales team, "What each person did". */
it('a sales team reads “What each person did”, and a sales organisation of twenty “What each person said”', async () => {
  me = { id: 'u-w', firstName: 'Wairimu', lastName: 'Kamau', role: 'LEAD' }
  ;(boardApi.get as any).mockResolvedValue({ ...BOARD, kindOfWork: 'sales org' })
  renderIt()
  expect(await screen.findByText('What each person did')).toBeTruthy()
  cleanup()
  ;(reportsApi.sessionReport as any).mockResolvedValue({ ...REPORT, counting: Array.from({ length: 20 }, (_, i) => ({ who: `Rep ${i}`, answered: i > 0 })) })
  renderIt()
  expect(await screen.findByText('What each person said')).toBeTruthy()
})

/* team-report.jpg, "What I don’t know yet": what the check-in asked and did not get, and what happens next, served to whoever runs it. */
/* Changed in F5 (Hafsah's change 4 to the approved journey): what is not known yet comes before what each person said, after where
   people differ, no longer below "Every session". */
it('Wairimu reads what Groundwork does not know yet, before what each person said, and what it will do next', async () => {
  me = { id: 'u-w', firstName: 'Wairimu', lastName: 'Kamau', role: 'LEAD' }
  ;(reportsApi.sessionReport as any).mockResolvedValue({ ...REPORT, whatIDontKnowYet: [
    { title: '“What is getting in the way now?”', says: 'Groundwork asked Samuel this in check-in 35 and once more since, and Samuel has not answered it yet. Next: Groundwork will not ask again, so that Samuel is not pressed. You could ask Samuel yourself.' },
  ] })
  renderIt()
  const heading = await screen.findByText('What I don’t know yet')
  expect(screen.getByText('Things Groundwork can’t tell from what it has, and what it will ask next.')).toBeTruthy()
  expect(screen.getByText('“What is getting in the way now?”')).toBeTruthy()
  expect(screen.getByText(/You could ask Samuel yourself\.$/)).toBeTruthy()
  const eachPerson = screen.getByText('What each person said')
  expect(heading.compareDocumentPosition(eachPerson) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
})

it('with nothing open, Wairimu reads that nothing is waiting for an answer; where the server serves no such list, there is no section', async () => {
  me = { id: 'u-w', firstName: 'Wairimu', lastName: 'Kamau', role: 'LEAD' }
  ;(reportsApi.sessionReport as any).mockResolvedValue({ ...REPORT, whatIDontKnowYet: [] })
  renderIt()
  expect(await screen.findByText('Nothing Groundwork asked for in this check-in is still waiting for an answer.')).toBeTruthy()
  cleanup()
  ;(reportsApi.sessionReport as any).mockResolvedValue(REPORT)
  renderIt()
  expect(await screen.findByText('In short')).toBeTruthy()
  expect(screen.queryByText('What I don’t know yet')).toBeNull()
})

/* salesorg-team-report.jpg and the other check-ins: with no question of the lead's to settle, there is no "One question to answer". */
it('with no question of hers to answer, Wairimu reads no “One question to answer”', async () => {
  me = { id: 'u-w', firstName: 'Wairimu', lastName: 'Kamau', role: 'LEAD' }
  ;(boardApi.get as any).mockResolvedValue({ ...BOARD, decisions: [] })
  ;(reportsApi.sessionReport as any).mockResolvedValue({ ...REPORT, theConversationWorthHaving: 'Settle Mama Fresh between the people who described it differently.' })
  renderIt()
  expect(await screen.findByText('In short')).toBeTruthy()
  expect(screen.queryByText('One question to answer')).toBeNull()
})

/* F5, Hafsah's change 4 to the approved journey: the report opens with where things stand and what needs the lead, then where people
   differ and what is not known yet, and only then what each person said. Read as the lead reads the page. */
it('Wairimu reads where things stand first, then what is not known yet, then what each person said', async () => {
  me = { id: 'u-w', firstName: 'Wairimu', lastName: 'Kamau', role: 'LEAD' }
  ;(reportsApi.sessionReport as any).mockResolvedValue({ ...REPORT, whatIDontKnowYet: [] })
  renderIt()
  await screen.findByText('What each person said')
  const text = (document.body.textContent ?? '').replace(/\s+/g, ' ')
  const at = ['In short', 'What this report can’t tell you', 'What I don’t know yet', 'What each person said'].map((h) => text.indexOf(h))
  expect(at.every((i) => i > -1)).toBe(true)
  expect([...at].sort((a, b) => a - b)).toEqual(at)
})
