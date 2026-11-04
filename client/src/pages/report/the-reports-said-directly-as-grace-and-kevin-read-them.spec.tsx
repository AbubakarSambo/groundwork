import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThePicturedTeamReport } from './pictured/ThePicturedTeamReport'
import { TheSessionsReport } from '@/components/gw/TheSessionsReport'
import WeeklyReportPage from './WeeklyReportPage'
import { TheDirectMorning } from '@/lib/the-direct-morning'
import { reportsApi } from '@/api/reports'
import { boardApi } from '@/api/board'
import { groundsApi } from '@/api/grounds'
import REPORTS from './__fixtures__/night-run-2-reports.json'
import BOARDS from '../board/__fixtures__/night-run-2-boards.json'

/**
 * THE TEAM'S REPORT AND THE WEEKLY REPORT, SAID DIRECTLY (the direct morning, Hafsah, 20 October 2026). The reports are what the API
 * served Grace Achieng (she runs "Sales team, Q4") and Kevin Omondi (a rep in it) on Tuesday 20 October in the morning, in the second
 * night run. Off, every line reads as it did. On, no line explains the report or Groundwork, and none says who sees it or that nothing
 * decides who is right; "The conversation worth having now" is "What to do next". What each reader is served is the same either way.
 */
vi.mock('@/api/reports', () => ({ reportsApi: { sharing: vi.fn(async () => null), sessionReport: vi.fn(), sendToEveryone: vi.fn(), get: vi.fn(async () => null), week: vi.fn() } }))
vi.mock('@/api/board', () => ({ boardApi: { get: vi.fn() } }))
vi.mock('@/api/client', () => ({ apiClient: { post: vi.fn(), patch: vi.fn(), get: vi.fn(async () => ({ data: null })) } }))
vi.mock('@/api/grounds', async (orig) => { const o: any = await orig(); return { ...o, groundsApi: { ...o.groundsApi, get: vi.fn() } } })

const R = REPORTS as any
const G = 'a0cdc357-32d0-4df4-bece-692b27e5511f'
const qc = () => new QueryClient({ defaultOptions: { queries: { retry: false } } })
const text = () => document.body.textContent ?? ''
const ONLY_CHANGES = 'It only changes when something new comes in, such as a check-in, a document or a number from another system.'

beforeEach(() => { vi.clearAllMocks() })

describe('the team’s report, as Grace reads it', () => {
  const open = (on: boolean) => {
    vi.mocked(reportsApi.sessionReport).mockResolvedValue(R.grace.teamReport.data)
    vi.mocked(boardApi.get).mockResolvedValue((BOARDS as any).grace)
    return render(<QueryClientProvider client={qc()}><MemoryRouter><ThePicturedTeamReport groundId={G} sessionNumber={R.grace.teamReport.sessionNumber} ground={{ label: 'Sales team, Q4', checkIns: [], participants: [], directMorningOn: on }} /></MemoryRouter></QueryClientProvider>)
  }
  it('off: when it was last updated, and how it changes, as before', async () => {
    open(false)
    expect(await screen.findByText(`Last updated on Tuesday 20 October at 8am, when Joseph checked in. ${ONLY_CHANGES}`)).toBeTruthy()
    expect(text()).toContain('Things Groundwork can’t tell from what it has, and what it will ask next.')
  })
  it('on: when it was last updated and who checked in, the day, and what she does not know yet, with no explanation', async () => {
    open(true)
    expect(await screen.findByText('Last updated on Tuesday 20 October at 8am, when Joseph checked in.')).toBeTruthy()
    expect(screen.getByText('The team’s report, Tuesday 20 October')).toBeTruthy()
    expect(screen.getByText('What I don’t know yet')).toBeTruthy()
    expect(text()).not.toContain(ONLY_CHANGES)
    expect(text()).not.toMatch(/Things Groundwork can’t tell/)
  })
})

describe('the team’s report, as Kevin reads it once it is shared', () => {
  const open = (on: boolean) => {
    vi.mocked(reportsApi.sessionReport).mockResolvedValue(R.kevin.teamReport.data)
    return render(<QueryClientProvider client={qc()}><MemoryRouter><TheDirectMorning on={on}><TheSessionsReport groundId={G} sessionNumber={R.kevin.teamReport.sessionNumber} light /></TheDirectMorning></MemoryRouter></QueryClientProvider>)
  }
  it('off: "Nothing here decides who is right." under it, as before', async () => {
    open(false)
    await screen.findByText('One question to answer')
    expect(text()).toContain('People are still answering, so this moves. Everybody in this check-in reads this same report. Nothing here decides who is right.')
    expect(screen.getByText('The picture from everybody')).toBeTruthy()
  })
  it('on: the question to answer, what everybody said, and a plain footer', async () => {
    open(true)
    await screen.findByText('One question to answer')
    expect(screen.getAllByText(/There is a difference in how sales are being counted towards the goal\./).length).toBeGreaterThan(0)
    expect(screen.getByText('What everybody said')).toBeTruthy()
    expect(screen.getByText('People are still answering.')).toBeTruthy()
    expect(text()).not.toMatch(/decides who is right|reads this same report|The picture from everybody|conversation worth having/)
  })
})

describe('the weekly report', () => {
  const open = (who: 'grace' | 'kevin', on: boolean) => {
    vi.mocked(groundsApi.get).mockResolvedValue({ id: G, label: 'Sales team, Q4', initiatorId: 'u-grace', checkIns: [], participants: [] } as any)
    vi.mocked(reportsApi.week).mockResolvedValue({ ...R[who].weekly, directMorning: on })
    return render(<QueryClientProvider client={qc()}><MemoryRouter initialEntries={[`/grounds/${G}/report/week`]}><Routes><Route path="/grounds/:id/report/week" element={<WeeklyReportPage />} /></Routes></MemoryRouter></QueryClientProvider>)
  }
  const WHAT_THIS_IS = 'The daily reports show each day. This weekly report shows what kept happening for three check-ins in a row or more.'
  for (const who of ['grace', 'kevin'] as const) {
    it(`${who}, off: the line explaining what a weekly report is, as before`, async () => {
      open(who, false)
      await screen.findByText('This week, 19 Oct, so far. Written Tuesday 20 October.')
      expect(screen.getByText(WHAT_THIS_IS)).toBeTruthy()
    })
    it(`${who}, on: the week itself, with no explanation`, async () => {
      open(who, true)
      await screen.findByText('This week, 19 Oct, so far. Written Tuesday 20 October.')
      expect(screen.queryByText(WHAT_THIS_IS)).toBeNull()
      expect(screen.getByText(who === 'grace'
        ? 'One price this week is only someone’s word: Ngong Road Minimart’s KES 25,000. Ask for a copy of the quote.'
        : 'One price this week is only your word: Ngong Road Minimart’s KES 25,000. Ask for a copy of the quote.')).toBeTruthy()
    })
  }
})
