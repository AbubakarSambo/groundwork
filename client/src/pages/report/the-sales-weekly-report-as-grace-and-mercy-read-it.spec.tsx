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
 * THE SALES WEEKLY REPORT, AS GRACE AND MERCY READ IT (Hafsah's points 23 to 25, 18 October; the kit's
 * B4-reports-every-check-in/sales-weekly-report.txt). Each payload is what the server served each of them on the Drop Access
 * test bed. Where the server sends "What this week shows" as paragraphs from the deals, the page draws those paragraphs and
 * no sentence about the words somebody named.
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

const GRACE_READS = {
  weekStart: '2026-10-12',
  builtAt: '2026-10-18T00:19:11.393Z',
  heading: 'This week, 12 to 18 Oct, so far',
  inNumbers: [
    { figure: '100%', of: 'of check-ins made this week', says: 'All 16 check-ins due this week were made.' },
    { figure: '4', of: 'deals moved stage, of the 9 whose moves are kept', says: '' },
    { figure: '0', of: 'moves backed by a photo or document', says: '' },
    { figure: '3', of: 'sales closed, 1 with proof of payment', says: '' },
    { figure: '1', of: 'deal hit the stall rule', says: '' },
  ],
  whatThisWeekShows: [
    'Sales moved forward this week, but much more for some people than for others.',
    'Joseph Kariuki moved one deal forward this week. Mama Pima Stores has not answered Joseph since 12 October.',
  ],
  eachPerson: [{ who: 'Joseph Kariuki', isYou: false, says: 'Joseph Kariuki moved one deal forward this week. Mama Pima Stores has not answered Joseph since 12 October.' }],
  acrossTheTeam: [],
  threeInARow: [],
  whatChanged: { moved: ['Kilele Hotel bought. There is a payment record.'], dropped: ['No deal was dropped this week.'], result: ['3 sales so far this week, 1 with proof of payment.'] },
  forNextWeek: [{ do: 'Ask Joseph Kariuki about Mama Pima Stores.', why: 'Mama Pima Stores has not answered since 12 October. The stall rule says to drop a deal when the customer has not answered for 3 working days.', comesFrom: 'This comes from the plan.' }],
}

describe('the sales weekly report', () => {
  beforeEach(() => {
    vi.mocked(groundsApi.get).mockResolvedValue({ id: 'g1', label: 'Sales team, Q4' } as any)
  })

  it('Grace reads the kit\'s five numbers, what this week shows from the deals, what changed in the deals and the stalled deal to ask about', async () => {
    vi.mocked(reportsApi.week).mockResolvedValue(GRACE_READS as any)
    renderWeek()
    expect(await screen.findByText('What this week shows')).toBeTruthy()
    expect(screen.getByText('Sales moved forward this week, but much more for some people than for others.')).toBeTruthy()
    expect(screen.getByText('Joseph Kariuki moved one deal forward this week. Mama Pima Stores has not answered Joseph since 12 October.')).toBeTruthy()
    expect(screen.getByText('moves backed by a photo or document')).toBeTruthy()
    expect(screen.getByText('Kilele Hotel bought. There is a payment record.')).toBeTruthy()
    expect(screen.getByText('Ask Joseph Kariuki about Mama Pima Stores.')).toBeTruthy()
    expect(screen.getByText('This comes from the plan.')).toBeTruthy()
    /* The paragraph is drawn once, not again from each person's sentence. */
    expect(screen.getAllByText(/Mama Pima Stores has not answered Joseph since 12 October/)).toHaveLength(1)
  })

  it('Mercy reads only her own deals, and nothing to do that is Grace\'s', async () => {
    vi.mocked(reportsApi.week).mockResolvedValue({
      ...GRACE_READS,
      whatThisWeekShows: ['You closed one sale and moved two other deals forward this week. Nothing written shows a payment yet for Greenfield Supermarket.'],
      eachPerson: [{ who: 'You', isYou: true, says: 'You closed one sale and moved two other deals forward this week. Nothing written shows a payment yet for Greenfield Supermarket.' }],
      whatChanged: { moved: ['Greenfield Supermarket bought. A document backs it, but it does not show a payment.'], dropped: ['No deal was dropped this week.'], result: ['1 sale so far this week, with no proof of payment yet.'] },
      forNextWeek: [],
    } as any)
    renderWeek()
    expect(await screen.findByText('You closed one sale and moved two other deals forward this week. Nothing written shows a payment yet for Greenfield Supermarket.')).toBeTruthy()
    expect(screen.getByText('1 sale so far this week, with no proof of payment yet.')).toBeTruthy()
    expect(screen.queryByText(/Joseph|Kilele|much more for some/)).toBeFalsy()
    expect(screen.queryByText('For you to do next week')).toBeFalsy()
  })

  it('the whole report (?whole=1) draws the same paragraphs', async () => {
    vi.mocked(reportsApi.week).mockResolvedValue(GRACE_READS as any)
    renderWeek('/grounds/g1/report/week?whole=1')
    expect(await screen.findByText('Sales moved forward this week, but much more for some people than for others.')).toBeTruthy()
    expect(screen.getAllByText(/Mama Pima Stores has not answered Joseph since 12 October/)).toHaveLength(1)
  })
})
/*
 * Hafsah's quality pass of 18 October, section 6: the week of 12 to 14 October on the short run (gw_sweep_drop3), as the API now
 * serves it to Grace (the-weekly-report-of-12-to-14-october-as-each-reader-reads-it.spec.ts builds the same from the record).
 */
describe('the weekly report of 12 to 14 October, as Grace reads it', () => {
  const SERVED = {
    weekStart: '2026-10-12', builtAt: '2026-10-15T08:00:00.000Z',
    heading: 'This week, 12 to 14 Oct, so far. Written Thursday 15 October.',
    whatThisIs: 'The daily reports show each day. This weekly report shows what kept happening for three check-ins in a row or more.',
    inNumbers: [
      { figure: '100%', of: 'of check-ins made this week', says: '' },
      { figure: '4', of: 'deals moved stage', says: '' },
      { figure: '2', of: 'sales backed by a document', says: '' },
      { figure: '2', of: 'sales closed, 1 with proof of payment', says: '' },
      { figure: '0', of: 'deals hit a stall rule', says: 'No stall rule is set yet, so no deal is marked for going quiet.' },
    ],
    whatThisWeekShows: ['Sales moved forward this week, but much more for some people than for others.', 'Kevin Omondi sold 40 units, paid, to Kilele Hotel. Kevin quoted Savannah Cafe and Ngong Road Minimart before asking the budget.'],
    eachPerson: [],
    acrossTheTeam: ['Joseph Kariuki’s two deals and Mercy Wairimu’s Tuskys Westgate all wait on one person each.'],
    threeInARow: [{ who: 'Joseph Kariuki', isYou: false, says: 'The samples for Tuskys Westgate, promised three check-ins running, still not done.' }],
    saidAndProof: 'Four prices this week are only someone’s word: Savannah Cafe’s KES 15,000 deposit, the KES 30,000 and KES 20,000 quotes from Kevin Omondi, and Mama Mboga Mart’s KES 10,000. Ask for a copy of each quote.',
    whatChanged: { moved: ['Kilele Hotel bought. There is a payment record.'], dropped: ['Kamau Electricals was lost, because they already buy from another supplier.'], adapted: ['Kevin Omondi will ask about their budget during the initial conversations with new leads (14 October).'], result: ['2 sales so far this week, 1 with proof of payment.'] },
    forNextWeekIsRanked: true,
    forNextWeek: [
      { do: 'Answer Joseph Kariuki on 5 units at KES 4,500 for Juja Hardware', why: 'Mr Kariuki is waiting for Joseph Kariuki to call back.', comesFrom: 'This comes from a blocker.' },
      { do: 'Decide whether Mama Pima Stores can have 10 units for KES 38,000, which is KES 12,000 off', why: 'Wanjiru asked Joseph Kariuki on 12 October and has had no answer. You said on 12 October that you would decide that day.', comesFrom: 'This comes from a blocker.' },
      { do: 'Decide what to do about the samples for Tuskys Westgate', why: 'Joseph Kariuki promised it three check-ins running, and Mercy Wairimu is still waiting.', comesFrom: 'This comes from a blocker that keeps coming back.' },
      { do: 'Tell the team a sale counts only with a payment or a signed order', why: 'Mercy Wairimu counted Greenfield Supermarket as sold on 12 October, before there was a payment or a signed order.', comesFrom: 'This comes from the plan.' },
      { do: 'Decide whether Kevin Omondi drops Upper Hill Offices', why: 'Paul has not answered three calls from Kevin Omondi, on 13 and 14 October. No stall rule is set yet.', comesFrom: 'This comes from the plan.' },
    ],
  }
  beforeEach(() => { vi.mocked(groundsApi.get).mockResolvedValue({ id: 'g1', label: 'Sales team, Q4' } as any) })

  it('reads the heading, the amber strip, the promise carried over, the prices only said, Adapted, and all five things to do in order', async () => {
    vi.mocked(reportsApi.week).mockResolvedValue(SERVED as any)
    renderWeek()
    expect(await screen.findByText('This week, 12 to 14 Oct, so far. Written Thursday 15 October.')).toBeTruthy()
    expect(screen.getByText(SERVED.acrossTheTeam[0])).toBeTruthy()
    expect(screen.getByText(SERVED.threeInARow[0].says)).toBeTruthy()
    expect(screen.queryByText('Nothing happened three check-ins in a row this week.')).toBeNull()
    expect(screen.getByText(SERVED.saidAndProof)).toBeTruthy()
    expect(screen.getByText('Adapted')).toBeTruthy()
    expect(screen.getByText(SERVED.whatChanged.adapted[0])).toBeTruthy()
    const text = document.body.textContent ?? ''
    let at = -1
    for (const t of SERVED.forNextWeek) {
      const i = text.indexOf(t.do)
      expect(i).toBeGreaterThan(at)
      at = i
    }
    expect(text).not.toMatch(/order confirmation process|deal activation/)
  })
})
