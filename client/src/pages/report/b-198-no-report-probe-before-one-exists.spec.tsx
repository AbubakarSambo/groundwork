import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

vi.mock('@/api/conversation', () => ({ conversationApi: { sessionReport: vi.fn(), download: vi.fn() } }))
vi.mock('@/api/reports', () => ({ reportsApi: { sessionReport: vi.fn(), get: vi.fn(), startSelfCorrection: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn(), update: vi.fn() } }))
vi.mock('@/stores/auth', () => ({ useAuthStore: (pick: any) => pick({ user: { id: 'u-rukia' } }) }))
vi.mock('@/components/gw/TheCheckInYouJustFinished', () => ({ TheCheckInYouJustFinished: () => null }))
vi.mock('@/components/gw/TheSessionsReport', () => ({ TheSessionsReport: () => <div>the team’s report body</div> }))
vi.mock('@/components/gw/WhatWasTakenFromWhatYouSaid', () => ({ WhatWasTakenFromWhatYouSaid: () => null }))

import { conversationApi } from '@/api/conversation'
import { reportsApi } from '@/api/reports'
import { groundsApi } from '@/api/grounds'
import SessionReportPage from './SessionReportPage'

/**
 * B-198: SESSION 1'S OWN REPORT PAGE ASKED FOR A TEAM REPORT THAT DOES NOT EXIST YET.
 *
 * `groundReport` (`GET /grounds/:id/report`) was gated only on `!!data?.groundId`, so a check-in's
 * very first session - which by definition has no team report yet - still asked for one on every
 * visit to its own session-1 report page, logging a 404 for something the page already knew was not
 * there: `ground.report` (served by the same `GroundsService.get` the `ground` query above reads)
 * says so up front, the same field `GroundParticipantPage`'s matching query is already gated on.
 *
 * Fixed by adding that gate here too. `reportsApi.get` must simply never be called when
 * `ground.report` is falsy.
 */
function renderIt() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/checkin/c1/report']}>
        <Routes><Route path="/checkin/:checkInId/report" element={<SessionReportPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(conversationApi.sessionReport).mockResolvedValue({ groundId: 'g1', sessionNumber: 1, report: { any: 'thing' }, finishedAt: '2026-09-27T10:00:00.000Z' } as any)
  vi.mocked(reportsApi.sessionReport).mockResolvedValue({ correctable: false, whyNotCorrectable: 'The window to correct it has closed.', state: 'final', takenAt: '2026-09-27T10:00:00.000Z' } as any)
  vi.mocked(groundsApi.get).mockResolvedValue({
    id: 'g1',
    report: null,
    participants: [{ userId: 'u-rukia', partyType: 'INITIATOR' }],
    sessionProgress: { sessionNumber: 1, total: 3, completed: 1, missingParticipantIds: [], requestingUserIsMissing: false },
  } as any)
})

describe('a session-1 report page never asks for a team report before the check-in has one', () => {
  it('never calls reportsApi.get while ground.report is falsy', async () => {
    renderIt()
    await screen.findByText('the team’s report body', { exact: false }).catch(() => {})
    // Give any stray effect a tick to have fired the call if it were going to.
    await new Promise((r) => setTimeout(r, 50))
    expect(reportsApi.get).not.toHaveBeenCalled()
  })

  it('does call it once the check-in actually has a report', async () => {
    vi.mocked(groundsApi.get).mockResolvedValue({
      id: 'g1',
      report: { exists: true },
      participants: [{ userId: 'u-rukia', partyType: 'INITIATOR' }],
      sessionProgress: { sessionNumber: 1, total: 3, completed: 1, missingParticipantIds: [], requestingUserIsMissing: false },
    } as any)
    vi.mocked(reportsApi.get).mockResolvedValue({ coaching: null, postReportGuide: null, probes: [], inferences: [], myRows: [] } as any)
    renderIt()
    await waitFor(() => expect(reportsApi.get).toHaveBeenCalledWith('g1'))
  })
})
