import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

vi.mock('@/api/conversation', () => ({ conversationApi: { sessionReport: vi.fn(), download: vi.fn() } }))
vi.mock('@/api/reports', () => ({ reportsApi: { sessionReport: vi.fn(), get: vi.fn(), startSelfCorrection: vi.fn(), sharing: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn(), update: vi.fn() } }))
vi.mock('@/stores/auth', () => ({ useAuthStore: (pick: any) => pick({ user: { id: 'u-kevin' } }) }))
vi.mock('@/components/gw/TheCheckInYouJustFinished', () => ({ TheCheckInYouJustFinished: () => <p>What you did well</p> }))
vi.mock('@/components/gw/TheSessionsReport', () => ({ TheSessionsReport: () => <div>the team’s report body</div> }))
vi.mock('@/components/gw/WhatWasTakenFromWhatYouSaid', () => ({ WhatWasTakenFromWhatYouSaid: () => null }))

import { conversationApi } from '@/api/conversation'
import { reportsApi } from '@/api/reports'
import { groundsApi } from '@/api/grounds'
import SessionReportPage from './SessionReportPage'

/**
 * KEVIN'S OWN REPORT, MONDAY 19 OCTOBER (nudges that get answers, 20 October 2026). The line is what the API serves him from the second
 * night run (api engagement/on-time-on-their-own-report-as-kevin-reads-it.spec.ts): "You checked in on time today, 6 days running." It is
 * drawn where it is served and nowhere else; with the direct morning off it is never served.
 */
function renderIt(at = '/checkin/c6/report') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[at]}>
        <Routes><Route path="/checkin/:checkInId/report" element={<SessionReportPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('Kevin’s own report', () => {
  beforeEach(() => {
    vi.mocked(reportsApi.sessionReport).mockResolvedValue({ released: false } as any)
    vi.mocked(reportsApi.get).mockResolvedValue({} as any)
    vi.mocked(groundsApi.get).mockResolvedValue({ id: 'g1', label: 'Sales team, Q4', kindOfWork: 'sales org', participants: [{ userId: 'u-kevin', partyType: 'PARTICIPANT' }] } as any)
  })

  it('reads that he checked in on time, under "Your report"', async () => {
    vi.mocked(conversationApi.sessionReport).mockResolvedValue({ groundId: 'g1', sessionNumber: 6, report: null, finishedAt: '2026-10-19T11:03:03.823Z', isInitiator: false, onTime: 'You checked in on time today, 6 days running.' } as any)
    renderIt()
    expect(await screen.findByText('You checked in on time today, 6 days running.')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Your report' })).toBeTruthy()
  })

  it('reads it on the whole page too', async () => {
    vi.mocked(conversationApi.sessionReport).mockResolvedValue({ groundId: 'g1', sessionNumber: 6, report: null, finishedAt: '2026-10-19T11:03:03.823Z', isInitiator: false, onTime: 'You checked in on time today, 6 days running.' } as any)
    renderIt('/checkin/c6/report?whole=1')
    expect(await screen.findByText('You checked in on time today, 6 days running.')).toBeTruthy()
  })

  it('reads nothing of it where nothing is served', async () => {
    vi.mocked(conversationApi.sessionReport).mockResolvedValue({ groundId: 'g1', sessionNumber: 6, report: null, finishedAt: '2026-10-19T11:03:03.823Z', isInitiator: false } as any)
    renderIt()
    expect(await screen.findByRole('heading', { name: 'Your report' })).toBeTruthy()
    expect(document.body.textContent).not.toMatch(/on time/)
  })
})
