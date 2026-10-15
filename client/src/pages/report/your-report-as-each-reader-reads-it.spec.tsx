import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

vi.mock('@/api/conversation', () => ({ conversationApi: { sessionReport: vi.fn(), download: vi.fn() } }))
vi.mock('@/api/reports', () => ({ reportsApi: { sessionReport: vi.fn(), get: vi.fn(), startSelfCorrection: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn(), update: vi.fn() } }))
vi.mock('@/stores/auth', () => ({ useAuthStore: (pick: any) => pick({ user: { id: 'u-miriam' } }) }))
/* The parts below the heading each have their own tests; this one reads the page's own words. */
vi.mock('@/components/gw/TheCheckInYouJustFinished', () => ({ TheCheckInYouJustFinished: () => null }))
vi.mock('@/components/gw/TheSessionsReport', () => ({ TheSessionsReport: () => <div>the team’s report body</div> }))
vi.mock('@/components/gw/WhatWasTakenFromWhatYouSaid', () => ({ WhatWasTakenFromWhatYouSaid: () => null }))

import { conversationApi } from '@/api/conversation'
import { reportsApi } from '@/api/reports'
import { groundsApi } from '@/api/grounds'
import SessionReportPage from './SessionReportPage'

/**
 * U.9: A SESSION'S PAGE, AS THE PERSON WHOSE CHECK-IN IT IS READS IT.
 *
 * The server only opens `/checkin/:id/report` for the person who wrote the check-in (a lead or an
 * admin gets 403, and the page says so: see an-error-says-which-one). So the one reader of "Your
 * report" is its owner, and the words are the prototype's (own-report.txt): "Your report", "Only
 * you", "The team’s report" and "Something here isn’t right".
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

describe('a session’s page, as its owner reads it', () => {
  beforeEach(() => {
    vi.mocked(conversationApi.sessionReport).mockResolvedValue({ groundId: 'g1', sessionNumber: 38, report: { any: 'thing' }, finishedAt: '2026-09-23T17:00:00.000Z' } as any)
    vi.mocked(reportsApi.sessionReport).mockResolvedValue({ correctable: true } as any)
    vi.mocked(reportsApi.get).mockResolvedValue({} as any)
    vi.mocked(groundsApi.get).mockResolvedValue({ id: 'g1', participants: [{ userId: 'u-miriam', partyType: 'PARTICIPANT' }] } as any)
  })

  it('calls her half "Your report", says only she sees it, and calls the other half the team’s report', async () => {
    renderIt()
    expect(await screen.findByRole('heading', { name: 'Your report' })).toBeTruthy()
    expect(screen.getByText('Only you')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'The team’s report' })).toBeTruthy()
    expect(await screen.findByText('Something here isn’t right')).toBeTruthy()
    expect(screen.getByText('Everything about this session, on 23 September. Your report first, then the team’s report.')).toBeTruthy()
    const text = document.body.textContent ?? ''
    expect(text).not.toMatch(/Yours alone|The shared report|Something here is wrong/)
  })

  /*
   * U.9 REVIEW FIX 8: "IT UPDATES AS PEOPLE CHECK IN" WAS SAID EVEN ON A REPORT THAT HAD CLOSED.
   * The lead's Sessions tab told the truth further down the same page ("Closed 27 Sept 2026. This
   * does not change."), and this line above it claimed the opposite about the same report. It now
   * agrees with what `shape.state` actually says, with the closed date through the shared
   * formatter, not a hand-written one.
   */
  it('says the team’s report still updates while it is forming, and that it has closed once it has', async () => {
    vi.mocked(reportsApi.sessionReport).mockResolvedValue({ correctable: true, state: 'forming' } as any)
    renderIt()
    expect(await screen.findByText(/it updates as people check in/)).toBeTruthy()
    expect(document.body.textContent).not.toContain('This does not change.')
  })

  it('says the team’s report has closed, with the date through the shared formatter, once it has', async () => {
    vi.mocked(reportsApi.sessionReport).mockResolvedValue({ correctable: false, whyNotCorrectable: 'The window to correct it has closed.', state: 'final', takenAt: '2026-09-27T10:00:00.000Z' } as any)
    renderIt()
    /*
     * WORDING UPDATED (group 3's review, request batch A, fault 2): "What anyone said about
     * somebody else never does" was not true - a person's own words that name somebody else stay
     * as they said them (their-own-words-stay.ts), and the same report this sentence sits on can
     * read "Baraka Mwangi and Neema Achieng are waiting on Rukia Otieno for 3 things". Only a
     * lead's private judgement of a person is withheld from anyone but the lead, which is what the
     * sentence now says.
     */
    expect(await screen.findByText('Closed 27 Sept 2026. This does not change. What each person said about their own work can appear here. Nobody\'s private judgement of somebody else does.')).toBeTruthy()
    expect(document.body.textContent).not.toMatch(/it updates as people check in/)
  })
})
