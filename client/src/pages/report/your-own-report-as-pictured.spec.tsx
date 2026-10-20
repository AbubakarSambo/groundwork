import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

vi.mock('@/api/conversation', () => ({ conversationApi: { sessionReport: vi.fn(), download: vi.fn() } }))
vi.mock('@/api/reports', () => ({ reportsApi: { sessionReport: vi.fn(), get: vi.fn(), startSelfCorrection: vi.fn(), sharing: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn(), update: vi.fn() } }))
vi.mock('@/stores/auth', () => ({ useAuthStore: (pick: any) => pick({ user: { id: 'u-miriam' } }) }))
vi.mock('@/components/gw/TheCheckInYouJustFinished', () => ({ TheCheckInYouJustFinished: () => <p>What you did well</p> }))
vi.mock('@/components/gw/TheSessionsReport', () => ({ TheSessionsReport: () => <div>the team’s report body</div> }))
vi.mock('@/components/gw/WhatWasTakenFromWhatYouSaid', () => ({ WhatWasTakenFromWhatYouSaid: () => null }))

import { conversationApi } from '@/api/conversation'
import { reportsApi } from '@/api/reports'
import { groundsApi } from '@/api/grounds'
import SessionReportPage from './SessionReportPage'

/**
 * YOUR OWN REPORT, AS PICTURED, ON A SALES CHECK-IN (own-report.jpg, screen match 16 October). Miriam reads the
 * check-in's name and the day, "Only you", "Your report", her own report, and whether the team's report is shared
 * yet. Nothing of the team's report is on this page until it is shared. The page as it was is one tap away.
 */
function renderIt(at = '/checkin/c4/report') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[at]}>
        <Routes><Route path="/checkin/:checkInId/report" element={<SessionReportPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('your own report, on a sales check-in', () => {
  beforeEach(() => {
    vi.mocked(conversationApi.sessionReport).mockResolvedValue({ groundId: 'g1', sessionNumber: 38, report: null, finishedAt: '2026-09-23T17:00:00.000Z' } as any)
    vi.mocked(reportsApi.sessionReport).mockResolvedValue({ released: false } as any)
    vi.mocked(reportsApi.get).mockResolvedValue({} as any)
    vi.mocked(groundsApi.get).mockResolvedValue({ id: 'g1', label: 'Sales team, Q3', kindOfWork: 'sales org', participants: [{ userId: 'u-miriam', partyType: 'PARTICIPANT' }] } as any)
  })

  it('reads as pictured, with the team’s report waiting and nothing of it shown', async () => {
    renderIt()
    expect(await screen.findByText('Not shared yet.')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Your report' })).toBeTruthy()
    expect(document.body.textContent).toContain('Sales team, Q3, ')
    expect(screen.getByText('Only you')).toBeTruthy()
    expect(screen.getByText('What you did well')).toBeTruthy()
    expect(screen.getByText('Not shared yet.')).toBeTruthy()
    expect(screen.getByText('Waiting')).toBeTruthy()
    expect(screen.queryByText('the team’s report body')).toBeNull()
    expect(screen.getByRole('link', { name: 'See every other part of this report' }).getAttribute('href')).toBe('/checkin/c4/report?whole=1')
  })

  it('says when the team’s report is usually shared, from the check-in’s set time (Hafsah’s answers 1 and 5)', async () => {
    vi.mocked(groundsApi.get).mockResolvedValue({ id: 'g1', label: 'Sales team, Q3', kindOfWork: 'sales org', report: { id: 'r1' }, participants: [{ userId: 'u-miriam', partyType: 'PARTICIPANT' }] } as any)
    vi.mocked(reportsApi.sharing).mockResolvedValue({ sessionNumber: 38, shared: false, held: false, at: '6:30pm', says: 'It is usually shared by 6:30pm. You’ll get an email when it is.' })
    renderIt()
    expect(await screen.findByText('Not shared yet. It is usually shared by 6:30pm.')).toBeTruthy()
    expect(screen.getByText('Waiting')).toBeTruthy()
  })

  it('keeps the page as it was one tap away', async () => {
    renderIt('/checkin/c4/report?whole=1')
    expect(await screen.findByText('Everything about this session, on 23 September. Your report first, then the team’s report.')).toBeTruthy()
  })
})

/**
 * WITH THE DIRECT MORNING ON (Hafsah, 20 October 2026): Kevin's own report on "Sales team, Q4" carries no "Only you" tag, and the
 * team's report, once shared, is "Shared. Open it." Who may read his own report is the server's rule, the same either way.
 */
describe('your own report, with the direct morning on', () => {
  beforeEach(() => {
    vi.mocked(conversationApi.sessionReport).mockResolvedValue({ groundId: 'g1', sessionNumber: 6, report: null, finishedAt: '2026-10-19T09:00:00.000Z' } as any)
    vi.mocked(reportsApi.get).mockResolvedValue({} as any)
  })
  const ground = (on: boolean) => ({ id: 'g1', label: 'Sales team, Q4', kindOfWork: 'sales team', directMorningOn: on, participants: [{ userId: 'u-miriam', partyType: 'PARTICIPANT' }] })

  it('off: "Only you", as before', async () => {
    vi.mocked(reportsApi.sessionReport).mockResolvedValue({ released: true } as any)
    vi.mocked(groundsApi.get).mockResolvedValue(ground(false) as any)
    renderIt()
    expect(await screen.findByText('Shared. Open it to read the whole team’s picture.')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Your report' })).toBeTruthy()
    expect(screen.getByText('Only you')).toBeTruthy()
  })

  it('on: no "Only you", and the team’s report is "Shared. Open it."', async () => {
    vi.mocked(reportsApi.sessionReport).mockResolvedValue({ released: true } as any)
    vi.mocked(groundsApi.get).mockResolvedValue(ground(true) as any)
    renderIt()
    expect(await screen.findByText('Shared. Open it.')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Your report' })).toBeTruthy()
    expect(screen.queryByText('Only you')).toBeNull()
    expect(screen.getByText('What you did well')).toBeTruthy()
  })
})
