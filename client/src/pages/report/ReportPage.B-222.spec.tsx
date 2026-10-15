import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useSearchParams, useParams } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReportPage } from './ReportPage'
import { groundsApi } from '@/api/grounds'

/**
 * B-222. The "report ready" email links `/grounds/:id/report`. A participant arriving there already
 * reads their report straight away (B-203, on `GroundParticipantPage`). The lead - and an admin who
 * may read the check-in - used to land on "Every session" instead (`?tab=report`), one click short
 * of the report the email promised. This now opens the newest RELEASED session's report for them,
 * and keeps today's landing for everybody else, and for a lead with nothing released yet.
 *
 * B-222 FOLLOW-UP: "the newest session's report" was too loose. The email says a report is READY -
 * a session with a completed check-in but nothing released to the team is still forming, the same
 * state the lead's own session list draws as "Not shared". This now opens the newest session
 * `buildSessionRows` marks `shared`, skipping any newer session that is only forming.
 */
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn() } }))

let currentUser: any = { id: 'lead-1', role: 'MEMBER', organizationId: 'org-1' }
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: currentUser }) }))

function LandedOnGround() {
  const [params] = useSearchParams()
  return <div>landed: ?tab={params.get('tab') ?? ''}</div>
}

function LandedOnSession() {
  const { n } = useParams<{ n: string }>()
  return <div>landed on session report {n}</div>
}

function renderReport() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds/g1/report']}>
        <Routes>
          <Route path="/grounds/:id/report" element={<ReportPage />} />
          <Route path="/grounds/:id" element={<LandedOnGround />} />
          <Route path="/grounds/:id/session/:n" element={<LandedOnSession />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

/** Session 1 is released ("Shared"); session 2 has a completed check-in but nothing released yet
    ("Not shared") - exactly Mira Costa's "Okr alignment" on Riverbank Trading, the case this
    follow-up exists for. */
const groundWithAReleasedAndAFormingSession = {
  id: 'g1',
  initiatorId: 'lead-1',
  organizationId: 'org-1',
  participants: [{ id: 'p1', userId: 'lead-1' }, { id: 'p2', userId: 'other' }],
  checkIns: [
    { sessionNumber: 1, status: 'COMPLETED', participantId: 'p1', isSetup: false, completedAt: '2026-01-01T00:00:00.000Z' },
    { sessionNumber: 1, status: 'COMPLETED', participantId: 'p2', isSetup: false, completedAt: '2026-01-01T00:00:00.000Z' },
    { sessionNumber: 2, status: 'COMPLETED', participantId: 'p1', isSetup: false, completedAt: '2026-01-08T00:00:00.000Z' },
  ],
  roundCompletions: [{ sessionNumber: 1 }],
  report: { releasedAt: '2026-01-01T00:00:00.000Z', releasedSessions: [1] },
}

describe('B-222: /grounds/:id/report opens the report that is actually ready, for whoever runs the ground', () => {
  it('the lead lands on the newest RELEASED session, skipping a newer session that is only forming', async () => {
    currentUser = { id: 'lead-1', role: 'MEMBER', organizationId: 'org-1' }
    ;(groundsApi.get as any).mockResolvedValue(groundWithAReleasedAndAFormingSession)
    renderReport()
    // Session 2 has a completed check-in (the old, too-loose rule would have opened it) but is not
    // released - session 1 is the newest one actually shared, so that is where this lands.
    expect(await screen.findByText('landed on session report 1')).toBeTruthy()
    expect(screen.queryByText('landed on session report 2')).toBeNull()
  })

  it('an org admin who may read it gets the same released report, not the list', async () => {
    currentUser = { id: 'admin-1', role: 'ADMIN', organizationId: 'org-1' }
    ;(groundsApi.get as any).mockResolvedValue(groundWithAReleasedAndAFormingSession)
    renderReport()
    expect(await screen.findByText('landed on session report 1')).toBeTruthy()
  })

  it('a later release is still the newest - lands on the latest released session, not the first', async () => {
    currentUser = { id: 'lead-1', role: 'MEMBER', organizationId: 'org-1' }
    ;(groundsApi.get as any).mockResolvedValue({
      ...groundWithAReleasedAndAFormingSession,
      checkIns: [
        ...groundWithAReleasedAndAFormingSession.checkIns,
        { sessionNumber: 2, status: 'COMPLETED', participantId: 'p2', isSetup: false, completedAt: '2026-01-09T00:00:00.000Z' },
      ],
      roundCompletions: [{ sessionNumber: 1 }, { sessionNumber: 2 }],
      report: { releasedAt: '2026-01-09T00:00:00.000Z', releasedSessions: [1, 2] },
    })
    renderReport()
    expect(await screen.findByText('landed on session report 2')).toBeTruthy()
  })

  it('a participant still lands on ?tab=report, reading their own report there (B-203 unchanged)', async () => {
    currentUser = { id: 'other', role: 'MEMBER', organizationId: 'org-1' }
    ;(groundsApi.get as any).mockResolvedValue(groundWithAReleasedAndAFormingSession)
    renderReport()
    expect(await screen.findByText('landed: ?tab=report')).toBeTruthy()
  })

  it('the lead keeps today’s landing when no session has been released yet, even with a completed session', async () => {
    currentUser = { id: 'lead-1', role: 'MEMBER', organizationId: 'org-1' }
    ;(groundsApi.get as any).mockResolvedValue({ ...groundWithAReleasedAndAFormingSession, report: null })
    renderReport()
    expect(await screen.findByText('landed: ?tab=report')).toBeTruthy()
  })

  it('the lead keeps today’s landing when there are no sessions at all', async () => {
    currentUser = { id: 'lead-1', role: 'MEMBER', organizationId: 'org-1' }
    ;(groundsApi.get as any).mockResolvedValue({ ...groundWithAReleasedAndAFormingSession, checkIns: [], roundCompletions: [], report: null })
    renderReport()
    expect(await screen.findByText('landed: ?tab=report')).toBeTruthy()
  })

  it('a stranger the server refuses gets the same fallback, which hands them the usual refusal', async () => {
    currentUser = { id: 'stranger', role: 'MEMBER', organizationId: 'org-9' }
    ;(groundsApi.get as any).mockRejectedValue({ response: { status: 404 } })
    renderReport()
    expect(await screen.findByText('landed: ?tab=report')).toBeTruthy()
  })
})
