import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

vi.mock('@/api/conversation', () => ({ conversationApi: { sessionReport: vi.fn(), download: vi.fn() } }))
vi.mock('@/api/reports', () => ({ reportsApi: { sessionReport: vi.fn(), get: vi.fn(), startSelfCorrection: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn(), update: vi.fn() } }))
vi.mock('@/stores/auth', () => ({ useAuthStore: (pick: any) => pick({ user: { id: 'u-someone-else' } }) }))

import { conversationApi } from '@/api/conversation'
import SessionReportPage from './SessionReportPage'

/**
 * OUTSIDE U.9, SAME KIND: "WHAT NOW?" OFFERED ITSELF ON THE PAGE THAT REFUSES YOU.
 *
 * The "What now? Start a new check-in / Copy the link" block at the foot of this page sat outside
 * the `!isLoading && !isError` guard that the rest of the page uses, so a session report that
 * refused the reader (403, "This report is not yours to open") still offered them a way to start a
 * new check-in and a link to copy for a report they cannot read. There is nothing this page can
 * usefully offer somebody it has just refused.
 *
 * WORDING UPDATED (group 3's review, request batch A, fault 4): the page used to say "This session
 * is not yours to open", which answers nothing - nobody can be let into another person's own
 * report, so the old toast's "whoever runs this check-in can let you in" was never true of this
 * page. It now says "This report is not yours to open. Each person's own report can only be read by
 * that person.", and the API call behind it (`conversationApi.sessionReport`) now carries
 * `skipForbiddenToast` so the generic toast does not say the untrue thing on top of it.
 */
function renderIt() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/checkin/c4/report']}>
        <Routes><Route path="/checkin/:checkInId/report" element={<SessionReportPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('a page that refuses you offers nothing at its foot', () => {
  beforeEach(() => {
    vi.mocked(conversationApi.sessionReport).mockRejectedValue({ response: { status: 403 } })
  })

  it('says this report is not yours to open, and offers no "What now?"', async () => {
    renderIt()
    expect(await screen.findByText('This report is not yours to open')).toBeTruthy()
    expect(screen.getByText('Each person’s own report can only be read by that person.')).toBeTruthy()
    expect(screen.queryByText('What now?')).toBeNull()
    expect(screen.queryByText('Start a new check-in')).toBeNull()
    expect(screen.queryByText('Copy the link')).toBeNull()
  })
})
