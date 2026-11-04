import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn() } }))
vi.mock('@/api/reports', () => ({ reportsApi: { week: vi.fn() } }))

import { groundsApi } from '@/api/grounds'
import { reportsApi } from '@/api/reports'
import WeeklyReportPage from './WeeklyReportPage'

/**
 * THE WEEKLY REPORT, DRAWN ONLY FROM WHAT THE SERVER SENDS (B4, "This week";
 * docs/answers-from-engine.md, request 9 part (d), decision 73).
 *
 * The server decides who reads what - a lead and an admin get `forNextWeek` and the figures; a
 * participant's own response simply leaves those fields out, and this page never adds a
 * restriction of its own, so these three cases are exactly what proves that: render whatever
 * payload each reader is served, and check the page shows it and nothing it was not sent.
 */
function renderWeek(entry = '/grounds/g1/report/week') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[entry]}>
        <Routes><Route path="/grounds/:id/report/week" element={<WeeklyReportPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('the weekly report, for each reader', () => {
  beforeEach(() => {
    vi.mocked(groundsApi.get).mockResolvedValue({ id: 'g1', label: 'Sales team, Q3' } as any)
  })

  it('shows the lead every section the server sends, including "For you to do next week"', async () => {
    vi.mocked(reportsApi.week).mockResolvedValue({
      weekStart: '2026-09-21',
      builtAt: '2026-09-23T10:00:00.000Z',
      heading: 'This week, 21 to 23 Sep, so far',
      whatThisIs: 'The daily reports show each day. This weekly report shows what kept happening for three check-ins in a row or more.',
      inNumbers: [{ figure: '67%', of: 'of check-ins made this week', says: '2 of the 3 check-ins due this week were made.' }],
      eachPerson: [{ who: 'Aisha', isYou: false, says: 'Aisha named Green Mart this week, and gave a next step and a date.' }],
      acrossTheTeam: ['Green Mart came up in what Aisha and Baraka said this week.'],
      threeInARow: [{ who: 'Baraka', isYou: false, says: 'The work stops until there is another call. This came up in 3 check-ins, in sessions 3, 4 and 5.' }],
      whatChanged: { moved: ['Aisha committed to call Mama Fresh by Thursday, and it is now done.'], dropped: ['Baraka committed to visit Kwik Stores, and it has been dropped.'], result: ['The targets that moved.'] },
      forNextWeek: [{ do: 'Decide whether a price range counts as a budget.', why: 'Aisha is waiting on you for it.', comesFrom: 'This comes from a blocker.' }],
    } as any)

    renderWeek()

    expect(await screen.findByRole('heading', { name: 'This week, 21 to 23 Sep, so far' })).toBeTruthy()
    expect(screen.getByText('67%')).toBeTruthy()
    expect(screen.getByText('Aisha named Green Mart this week, and gave a next step and a date.')).toBeTruthy()
    expect(screen.getByText('Green Mart came up in what Aisha and Baraka said this week.')).toBeTruthy()
    expect(screen.getByText('The work stops until there is another call. This came up in 3 check-ins, in sessions 3, 4 and 5.')).toBeTruthy()
    expect(screen.getByText('Decide whether a price range counts as a budget.')).toBeTruthy()
    expect(screen.getByText('This comes from a blocker.')).toBeTruthy()
    expect(screen.getByText('Sales team, Q3')).toBeTruthy()
  })

  it('shows a participant only their own sentence, and draws nothing where the server sent nothing (no forNextWeek, no figures)', async () => {
    vi.mocked(reportsApi.week).mockResolvedValue({
      weekStart: '2026-09-21',
      builtAt: '2026-09-23T10:00:00.000Z',
      heading: 'This week, 21 to 23 Sep, so far',
      eachPerson: [{ who: 'Baraka', isYou: true, says: 'You named Mama Fresh this week, but gave no next step or date, so it is not yet clear what happens next.' }],
    } as any)

    renderWeek()

    expect(await screen.findByText('You named Mama Fresh this week, but gave no next step or date, so it is not yet clear what happens next.')).toBeTruthy()
    expect(screen.queryByText('For you to do next week')).toBeFalsy()
    expect(screen.queryByText('The week in numbers')).toBeFalsy()
    expect(screen.queryByText('Aisha')).toBeFalsy()
  })

  it('shows an admin who only reads the lead’s view without the aim/limit fields and with no forNextWeek list', async () => {
    vi.mocked(reportsApi.week).mockResolvedValue({
      weekStart: '2026-09-21',
      builtAt: '2026-09-23T10:00:00.000Z',
      heading: 'This week, 21 to 23 Sep, so far',
      eachPerson: [{ who: 'Aisha', isYou: false, says: 'Aisha named Green Mart this week, and gave a next step and a date.' }],
    } as any)

    renderWeek()

    expect(await screen.findByText('Aisha named Green Mart this week, and gave a next step and a date.')).toBeTruthy()
    expect(screen.queryByText('For you to do next week')).toBeFalsy()
  })

  it('reads an earlier week by ?week=, and shows the "no weekly report for that week" sentence plainly', async () => {
    vi.mocked(reportsApi.week).mockResolvedValue({
      weekStart: null,
      builtAt: null,
      saying: 'There is no weekly report for that week.',
      eachPerson: [],
    } as any)

    renderWeek('/grounds/g1/report/week?week=2026-08-10')

    expect(await screen.findByText('There is no weekly report for that week.')).toBeTruthy()
    expect(reportsApi.week).toHaveBeenCalledWith('g1', '2026-08-10')
  })
})

describe('the weekly report as pictured, and the report as it was one tap away', () => {
  const WEEK = {
    weekStart: '2026-09-21', builtAt: '2026-09-23T10:00:00.000Z', heading: 'This week, 21 to 23 Sep, so far',
    inNumbers: [{ figure: '67%', of: 'of check-ins made this week', says: '2 of the 3 check-ins due this week were made.' }],
    eachPerson: [], acrossTheTeam: [], threeInARow: [],
    forNextWeek: [{ do: 'Agree what “qualified” means.', why: 'Then count the sales again.', comesFrom: 'This comes from a disagreement in the team.' }],
  }
  beforeEach(() => {
    vi.mocked(groundsApi.get).mockResolvedValue({ id: 'g1', label: 'Sales team, Q3' } as any)
    vi.mocked(reportsApi.week).mockResolvedValue(WEEK as any)
  })
  it('draws each number large with what it counts, each thing to do with where it comes from, and not the number’s own sentence', async () => {
    renderWeek()
    expect(await screen.findByText('67%')).toBeTruthy()
    expect(screen.getByText('of check-ins made this week')).toBeTruthy()
    expect(screen.queryByText('2 of the 3 check-ins due this week were made.')).toBeNull()
    expect(screen.getByText('This comes from a disagreement in the team.')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'See every other part of this report' })).toBeTruthy()
  })
  it('on ?whole=1, reads each number’s own sentence, as before', async () => {
    renderWeek('/grounds/g1/report/week?whole=1')
    expect(await screen.findByText('2 of the 3 check-ins due this week were made.')).toBeTruthy()
  })
  /* weekly-report.jpg: three things to do, each from a different place; every one is still on ?whole=1. */
  const MANY = [
    { do: 'Sort out a rule for old leads.', why: 'Samuel is waiting on you for it.', comesFrom: 'This comes from a blocker that keeps coming back.' },
    { do: 'Talk with David about the tasks.', why: 'David has seen this.', comesFrom: 'From a pattern' },
    { do: 'Talk with Brian about the visits.', why: 'Brian has seen this.', comesFrom: 'From a pattern' },
    { do: 'Settle the difference between what Brian and you said.', why: 'Mama Fresh.', comesFrom: 'This comes from a disagreement in the team.' },
    { do: 'Decide whether to hire a second driver.', why: 'You wrote this down as still to decide.', comesFrom: 'Decision needed' },
  ]
  it('the lead reads three things to do next week, each from a different place, and every one on ?whole=1', async () => {
    vi.mocked(reportsApi.week).mockResolvedValue({ ...WEEK, forNextWeek: MANY } as any)
    renderWeek()
    expect(await screen.findByText('Sort out a rule for old leads.')).toBeTruthy()
    expect(screen.getByText('Talk with David about the tasks.')).toBeTruthy()
    expect(screen.getByText('Settle the difference between what Brian and you said.')).toBeTruthy()
    expect(screen.queryByText('Talk with Brian about the visits.')).toBeNull()
    expect(screen.queryByText('Decide whether to hire a second driver.')).toBeNull()
  })
  it('on ?whole=1 the lead reads every thing to do next week', async () => {
    vi.mocked(reportsApi.week).mockResolvedValue({ ...WEEK, forNextWeek: MANY } as any)
    renderWeek('/grounds/g1/report/week?whole=1')
    expect(await screen.findByText('Talk with Brian about the visits.')).toBeTruthy()
    expect(screen.getByText('Decide whether to hire a second driver.')).toBeTruthy()
  })
})

describe('a week nothing has come into yet (faith90-weekly-report.jpg, screen 58)', () => {
  it('reads as the check-in, "Nothing here yet.", and "It fills in once people start checking in.", with "Your check-in"', async () => {
    vi.mocked(groundsApi.get).mockResolvedValue({ id: 'g1', label: 'Faith, first 90 days', cadence: 'WEEKLY', cadenceAnchorDay: 1, participants: [{}, {}], checkIns: [{ sessionNumber: 1 }] } as any)
    vi.mocked(reportsApi.week).mockResolvedValue({ weekStart: '2026-09-21', heading: 'This week', eachPerson: [], inNumbers: [], threeInARow: [], saying: 'No check-in has come in this week yet, so there is nothing to say yet about what people named.' } as any)
    renderWeek()
    expect(await screen.findByText('Nothing here yet.')).toBeTruthy()
    expect(screen.getByText('It fills in once people start checking in.')).toBeTruthy()
    expect(screen.getByText('2 people. Weekly, Mondays.')).toBeTruthy()
    expect(screen.getAllByRole('link', { name: 'Your check-in' }).every((a) => a.getAttribute('href') === '/grounds/g1')).toBe(true)
  })
})
