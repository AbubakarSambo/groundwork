import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

vi.mock('@/api/conversation', () => ({ conversationApi: { sessionReport: vi.fn(), download: vi.fn() } }))
vi.mock('@/api/reports', () => ({ reportsApi: { sessionReport: vi.fn(), get: vi.fn(), week: vi.fn(), sendToEveryone: vi.fn(), startSelfCorrection: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn(), update: vi.fn(), checkInYourself: vi.fn() } }))
let me = { id: 'u-wairimu' }
vi.mock('@/stores/auth', () => ({ useAuthStore: (pick: any) => pick({ user: me }) }))
vi.mock('@/components/gw/TheCheckInYouJustFinished', () => ({ TheCheckInYouJustFinished: () => null }))
vi.mock('@/components/gw/WhatWasTakenFromWhatYouSaid', () => ({ WhatWasTakenFromWhatYouSaid: () => null }))

import { conversationApi } from '@/api/conversation'
import { reportsApi } from '@/api/reports'
import { groundsApi } from '@/api/grounds'
import { TheSessionsReport } from '@/components/gw/TheSessionsReport'
import WeeklyReportPage from './WeeklyReportPage'
import SessionReportPage from './SessionReportPage'

/**
 * THE LIGHT SALES REPORTS, AS EACH READER READS THEM (docs/light-rebuild/sales-first.md, section 2;
 * the light prototype's s60, s62 and the share menu in s71).
 */
const SESSION = {
  sessionNumber: 23, plannedSessions: 46, state: 'forming', showsEverybody: true,
  counting: [{ who: 'Miriam Wanjiru', isYou: false, answered: true }, { who: 'Omar Hassan', isYou: false, answered: false }],
  finding: { key: 'numbers', text: 'The numbers on record add up to 30, five more than the aim.', basis: '1 of 2 people have answered.' },
  atAGlance: [{ label: 'Differences', value: '1', sub: 'People said different things about Mama Fresh.', tone: 'watch' }],
  whereThingsStand: { settled: ['Everyone is working to the target of 25 freezers.'], open: ['Mama Fresh'] },
  sections: [{ title: 'Progress and priorities', items: [{ text: 'Green Mart confirmed January by phone.', who: 'Miriam Wanjiru' }] }],
  whatEachPersonSaid: [{ who: 'Miriam Wanjiru', isYou: false, lines: ['Green Mart confirmed January by phone.'] }],
  theConversationWorthHaving: 'Settle Mama Fresh between the people who described it differently.',
  confidence: { band: 'partial', saying: 'There is enough here to talk about, and not enough to settle anything.', reasons: [] },
  inThisReport: { reliesOn: 'There is enough here to talk about, and not enough to settle anything', eachPersonDid: '1 person, each in their own words' },
}

function renderReport(payload: any) {
  vi.mocked(reportsApi.sessionReport).mockResolvedValue(payload)
  vi.mocked(reportsApi.get).mockResolvedValue({} as any)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter><TheSessionsReport groundId="g1" sessionNumber={23} light /></MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('the team report, light', () => {
  it('Wairimu, who runs it, reads one Share button with both ways inside, then In short, One question to answer and More in this report', async () => {
    renderReport({ ...SESSION, releaseThisSession: { sessionNumber: 23, saying: 'This shares the team’s picture of session 23 with everyone in the check-in.' } })
    expect(await screen.findByRole('heading', { name: 'In short' })).toBeTruthy()
    const share = screen.getByText('Share').closest('details') as HTMLElement
    expect(within(share).getByRole('button', { name: 'Share with the team' })).toBeTruthy()
    expect(within(share).getByRole('button', { name: 'Share without names' })).toBeTruthy()
    // Sharing without names goes through the one call that takes the names out.
    vi.mocked(reportsApi.sendToEveryone).mockResolvedValue({ sessionNumber: 23, sent: 1, failed: 0, alreadyTold: 0, notAsked: 0, sharedAs: 'ANONYMOUS' })
    fireEvent.click(within(share).getByRole('button', { name: 'Share without names' }))
    await vi.waitFor(() => expect(reportsApi.sendToEveryone).toHaveBeenCalledWith('g1', 'ANONYMOUS'))

    expect(screen.getByText('The numbers on record add up to 30, five more than the aim.')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'One question to answer' })).toBeTruthy()
    expect(screen.getByText('Settle Mama Fresh between the people who described it differently.')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'More in this report' })).toBeTruthy()
    const relies = screen.getByText('How much this report can rely on').closest('details') as HTMLElement
    expect(relies.hasAttribute('open')).toBe(false)
    expect(relies.querySelector('.gwui-fold-fact')?.textContent).toBe('There is enough here to talk about, and not enough to settle anything')
    const did = screen.getByText('What each person did').closest('details') as HTMLElement
    expect(within(did).getByRole('button', { name: 'Group by person' })).toBeTruthy()
    expect(document.body.textContent).not.toContain('The conversation worth having now')
  })

  it('an admin or a team member gets no Share button: the server sends the share only to the lead', async () => {
    renderReport(SESSION)
    expect(await screen.findByRole('heading', { name: 'In short' })).toBeTruthy()
    expect(screen.queryByText('Share')).toBeNull()
    expect(screen.queryByText('Share without names')).toBeNull()
  })
})

describe('the weekly report, light', () => {
  beforeEach(() => {
    vi.mocked(groundsApi.get).mockResolvedValue({ id: 'g1', label: 'Sales team, Q3', kindOfWork: 'sales org' } as any)
  })
  it('opens on what this week shows, the week in numbers and what to do next week; the rest folds with the server’s facts', async () => {
    vi.mocked(reportsApi.week).mockResolvedValue({
      weekStart: '2026-10-12', builtAt: null, heading: 'This week, 12 to 14 Oct, so far', whatThisIs: 'The daily reports show each day.',
      eachPerson: [{ who: 'Miriam Wanjiru', isYou: false, says: 'Miriam Wanjiru named Green Mart this week.' }],
      inNumbers: [{ figure: '83%', of: 'of check-ins made this week', says: '15 of the 18 check-ins due this week were made.' }],
      forNextWeek: [{ do: 'Decide on a stopping rule for old leads.', why: 'Brian Ochieng is waiting on you for it.', comesFrom: 'This comes from a blocker.' }],
      threeInARow: [{ who: 'David Mutua', isYou: false, says: 'Visits without the shop’s name.' }],
      saidAndProof: 'This week, people said 15 things in their check-ins. None has a photo.',
      inThisReport: { threeInARow: '1 thing that keeps happening', saidAndProof: 'This week, people said 15 things in their check-ins' },
    } as any)
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/grounds/g1/report/week']}>
          <Routes><Route path="/grounds/:id/report/week" element={<WeeklyReportPage />} /></Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    const shows = await screen.findByRole('region', { name: 'What this week shows' })
    const numbers = screen.getByRole('region', { name: 'The week in numbers' })
    const todo = screen.getByRole('region', { name: 'For you to do next week' })
    const more = screen.getByRole('region', { name: 'More in this report' })
    expect(shows.compareDocumentPosition(numbers) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(numbers.compareDocumentPosition(todo) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(within(numbers).getByText('15 of the 18 check-ins due this week were made.')).toBeTruthy()
    const three = within(more).getByText('Things that happened in three check-ins in a row').closest('details') as HTMLElement
    expect(three.querySelector('.gwui-fold-fact')?.textContent).toBe('1 thing that keeps happening')
    expect(within(three).getByText('Visits without the shop’s name.')).toBeTruthy()
  })
})

describe('the lead’s own report, when there isn’t one', () => {
  it('keeps "Own reports are private" and offers Check in yourself and Add context, never "still being written"', async () => {
    me = { id: 'u-wairimu' }
    vi.mocked(conversationApi.sessionReport).mockResolvedValue({ groundId: 'g1', sessionNumber: 23, report: null, finishedAt: null } as any)
    vi.mocked(reportsApi.sessionReport).mockResolvedValue({ correctable: true } as any)
    vi.mocked(reportsApi.get).mockResolvedValue({} as any)
    vi.mocked(groundsApi.get).mockResolvedValue({ id: 'g1', initiatorId: 'u-wairimu', status: 'ACTIVE', participants: [{ userId: 'u-wairimu', partyType: 'INITIATOR' }] } as any)
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/checkin/c1/report']}>
          <Routes><Route path="/checkin/:checkInId/report" element={<SessionReportPage />} /></Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(await screen.findByRole('heading', { name: 'Own reports are private' })).toBeTruthy()
    expect(screen.getByText('Each person’s own report is theirs alone. Yours appears here after your own check-in.')).toBeTruthy()
    expect(screen.getAllByRole('button', { name: 'Check in yourself' })).toHaveLength(1)
    expect(screen.getAllByRole('button', { name: 'Add context' })).toHaveLength(1)
    expect(screen.getByText('Your check-ins here are optional. Check in when you want your own view in the picture.')).toBeTruthy()
    expect(document.body.textContent).not.toContain('Your report is still being written')
  })
})
