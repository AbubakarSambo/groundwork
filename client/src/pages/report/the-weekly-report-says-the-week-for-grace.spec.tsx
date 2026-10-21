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
 * THE WEEKLY REPORT ON THE SCREEN SAYS THE WEEK FOR GRACE (browser test, 21 October 2026): the weekly letter's three parts, first, where the
 * server sends them (the person who runs it, the direct morning on). Without them, the page reads as before.
 */
const week = (extra: object) => ({ weekStart: '2026-10-19', builtAt: '2026-10-20T10:00:00.000Z', heading: 'This week, 19 Oct, so far', eachPerson: [{ who: 'Kevin', isYou: false, says: 'Kevin checked in every day.' }], inNumbers: [], ...extra })
function renderWeek() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds/g1/report/week']}>
        <Routes><Route path="/grounds/:id/report/week" element={<WeeklyReportPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('the weekly report says the week for Grace', () => {
  beforeEach(() => vi.mocked(groundsApi.get).mockResolvedValue({ id: 'g1', label: 'Sales team, Q4' } as any))

  it('Grace reads where the target stands, what moved with what shows it, and who needs her, with the evidence', async () => {
    vi.mocked(reportsApi.week).mockResolvedValue(week({ forTheLead: {
      target: '75 of 120 sold, 47 paid, 45 short, and the open deals cover 40.',
      movedWithProof: ['On Monday 19 October Kevin said “Roysambu Gym signed an order for 3 units.” The signed order is on file.'],
      needsYou: [{ says: 'Joseph has said three sales with nothing on file.', evidence: ['On Wednesday 14 October Joseph said “she paid a deposit.” Nothing on file shows it yet.'] }],
    } }) as any)
    renderWeek()
    expect(await screen.findByRole('heading', { name: 'Where the target stands' })).toBeTruthy()
    expect(screen.getByText('75 of 120 sold, 47 paid, 45 short, and the open deals cover 40.')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'What moved this week, with what shows it' })).toBeTruthy()
    expect(screen.getByText('On Monday 19 October Kevin said “Roysambu Gym signed an order for 3 units.” The signed order is on file.')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Who needs you' })).toBeTruthy()
    expect(screen.getByText('Joseph has said three sales with nothing on file.')).toBeTruthy()
    expect(screen.getByText('On Wednesday 14 October Joseph said “she paid a deposit.” Nothing on file shows it yet.')).toBeTruthy()
  })

  it('without them (Kevin, or the direct morning off), none of the three is drawn', async () => {
    vi.mocked(reportsApi.week).mockResolvedValue(week({}) as any)
    renderWeek()
    expect(await screen.findByText('Kevin checked in every day.')).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Where the target stands' })).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Who needs you' })).toBeNull()
  })
})
