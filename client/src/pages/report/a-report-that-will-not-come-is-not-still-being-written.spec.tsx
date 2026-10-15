import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

vi.mock('@/api/conversation', () => ({ conversationApi: { sessionReport: vi.fn(), download: vi.fn() } }))
vi.mock('@/api/reports', () => ({ reportsApi: { sessionReport: vi.fn(), get: vi.fn(), startSelfCorrection: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn(), update: vi.fn() } }))
vi.mock('@/stores/auth', () => ({ useAuthStore: (pick: any) => pick({ user: { id: 'u-amina' } }) }))
vi.mock('@/components/gw/TheCheckInYouJustFinished', () => ({ TheCheckInYouJustFinished: () => null }))
vi.mock('@/components/gw/TheSessionsReport', () => ({ TheSessionsReport: () => <div>the team’s report body</div> }))
vi.mock('@/components/gw/WhatWasTakenFromWhatYouSaid', () => ({ WhatWasTakenFromWhatYouSaid: () => null }))

import { conversationApi } from '@/api/conversation'
import { reportsApi } from '@/api/reports'
import { groundsApi } from '@/api/grounds'
import SessionReportPage from './SessionReportPage'

/**
 * "YOUR REPORT IS STILL BEING WRITTEN" NEVER CLEARED (staging test, 15 October 2026). A session run while signed in never
 * gets a report of its own, so after Amina finished hers the page said it was still being written, for more than ten
 * minutes and for ever. The server says which it is; what Amina reads now.
 */
const NOT_KEPT = 'This session was finished, but no separate report was kept for it. What you said, and what came from it, is shown on this page.'

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
  vi.mocked(reportsApi.sessionReport).mockResolvedValue({ correctable: false, state: 'final' } as any)
  vi.mocked(reportsApi.get).mockResolvedValue(null as any)
  vi.mocked(groundsApi.get).mockResolvedValue({ id: 'g1', report: null, participants: [{ userId: 'u-lead', partyType: 'INITIATOR' }] } as any)
})

describe('a finished session that gets no separate report', () => {
  it('says so in the server\'s sentence, not that it is still being written', async () => {
    vi.mocked(conversationApi.sessionReport).mockResolvedValue({ groundId: 'g1', sessionNumber: 1, report: null, finishedAt: '2026-10-15T08:00:00.000Z', isInitiator: false, state: 'not-kept', says: NOT_KEPT } as any)
    renderIt()
    expect(await screen.findByText(NOT_KEPT)).toBeInTheDocument()
    expect(screen.queryByText(/still being written/)).toBeNull()
  })

  it('and asks the server once, not every five seconds for ever', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.mocked(conversationApi.sessionReport).mockResolvedValue({ groundId: 'g1', sessionNumber: 1, report: null, finishedAt: '2026-10-15T08:00:00.000Z', isInitiator: false, state: 'not-kept', says: NOT_KEPT } as any)
    renderIt()
    await screen.findByText(NOT_KEPT)
    await vi.advanceTimersByTimeAsync(16_000)
    expect(conversationApi.sessionReport).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })
})
