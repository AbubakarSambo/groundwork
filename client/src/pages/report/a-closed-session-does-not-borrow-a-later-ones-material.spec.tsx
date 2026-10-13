import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
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
 * GROUP 3'S REVIEW, BATCH A, FAULT 1: SESSION 1'S OWN REPORT PAGE SHOWED SESSION 2'S MATERIAL.
 *
 * Walked live as Rukia on a closed session 1: under "Closed 27 Sept 2026. This does not change.",
 * "What to work on next" opened with "This is session 2 of sales and expansion work.", and the
 * lead's own probe list said "Has not answered this session. Nothing below is from this round." for
 * people the team report two sections above, on the same page, already said had checked in - because
 * the coaching note, the probe list and the inference review are all read from the check-in's
 * CURRENT working copy (`groundReport`, `GET /grounds/:id/report`), never from the session this page
 * is about. `ground.sessionProgress.sessionNumber` (the highest session anybody has actually
 * completed) says whether that current copy is still about this page's session.
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

const latestReport = {
  coaching: { showingUp: null, whyItMatters: 'x', beforeNextTime: [], general: true, role: null, whyNoRoleMap: null, aboutYou: ['This is session 2 of sales and expansion work.'] },
  postReportGuide: { openingLine: 'A later opening line.' },
  probes: [{ who: 'Baraka', participantId: 'p-baraka', probe: ['Has not answered this session. Nothing below is from this round.'], encourage: [], triedToUnblock: '' }],
  inferences: [{ id: 'i1', text: 'A later inference.', participantLabel: 'Baraka', reason: 'because' }],
  myRows: [],
}

describe('a closed session’s own page does not borrow a later session’s material', () => {
  beforeEach(() => {
    vi.mocked(conversationApi.sessionReport).mockResolvedValue({ groundId: 'g1', sessionNumber: 1, report: { any: 'thing' }, finishedAt: '2026-09-27T10:00:00.000Z' } as any)
    vi.mocked(reportsApi.sessionReport).mockResolvedValue({ correctable: false, whyNotCorrectable: 'The window to correct it has closed.', state: 'final', takenAt: '2026-09-27T10:00:00.000Z' } as any)
    vi.mocked(reportsApi.get).mockResolvedValue(latestReport as any)
    vi.mocked(groundsApi.get).mockResolvedValue({
      id: 'g1',
      /* B-198: `groundReport` is now gated on `ground.report` being truthy - true here, since a
         check-in on session 2 with session 1 already closed obviously already has a team report. */
      report: { any: 'thing' },
      participants: [{ userId: 'u-rukia', partyType: 'INITIATOR' }],
      sessionProgress: { sessionNumber: 2, total: 3, completed: 1, missingParticipantIds: [], requestingUserIsMissing: false },
    } as any)
  })

  it('does not draw the coaching note, the probe list or the inference review under the closed session’s own heading', async () => {
    renderIt()
    await screen.findByText('Closed 27 Sept 2026. This does not change. What each person said about their own work can appear here. Nobody\'s private judgement of somebody else does.')
    /* These belong to session 2, the one actually in progress, not to the closed session 1 this
       page is about - they must not appear above the new, clearly labelled section. */
    const sinceThenHeading = await screen.findByRole('heading', { name: 'Since then, in the latest check-in' })
    const beforeSinceThen = (node: Node) => (sinceThenHeading.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_PRECEDING) !== 0
    const aboutYou = await screen.findByText('This is session 2 of sales and expansion work.')
    const probe = await screen.findByText('Has not answered this session. Nothing below is from this round.')
    expect(beforeSinceThen(aboutYou)).toBe(false)
    expect(beforeSinceThen(probe)).toBe(false)
  })

  it('labels the moved material plainly as the latest check-in, not the session above', async () => {
    renderIt()
    await screen.findByRole('heading', { name: 'Since then, in the latest check-in' })
    expect(await screen.findByText(/This session is closed and does not change\. Since it closed, a later check-in has added more\./)).toBeTruthy()
    expect(await screen.findByText('This is session 2 of sales and expansion work.')).toBeTruthy()
    expect(await screen.findByText('Has not answered this session. Nothing below is from this round.')).toBeTruthy()
  })

  it('shows the coaching note and probe list under this session’s own heading when this session is the latest one', async () => {
    vi.mocked(conversationApi.sessionReport).mockResolvedValue({ groundId: 'g1', sessionNumber: 2, report: { any: 'thing' }, finishedAt: '2026-10-01T10:00:00.000Z' } as any)
    vi.mocked(groundsApi.get).mockResolvedValue({
      id: 'g1',
      report: { any: 'thing' },
      participants: [{ userId: 'u-rukia', partyType: 'INITIATOR' }],
      sessionProgress: { sessionNumber: 2, total: 3, completed: 1, missingParticipantIds: [], requestingUserIsMissing: false },
    } as any)
    renderIt()
    await screen.findByText('This is session 2 of sales and expansion work.')
    expect(screen.queryByRole('heading', { name: 'Since then, in the latest check-in' })).toBeNull()
  })
})
