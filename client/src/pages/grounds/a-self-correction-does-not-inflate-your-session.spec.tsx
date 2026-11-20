import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GroundParticipantPage } from './GroundParticipantPage'
import { groundsApi } from '@/api/grounds'
import { reportsApi } from '@/api/reports'

/**
 * FAULT 3b (ESTHER, LIVE RE-WALK): A SELF-CORRECTION DOUBLED HER SESSION COUNT.
 *
 * "This is your session N of M." used to read `completedCheckIns.length + 1` - a count of
 * completed ROWS. A self-corrected session (the same session answered twice, `isSelfCorrection`
 * marking the second row) leaves two completed rows for the one session actually finished, so
 * Esther, who had finished and then corrected session 1, read "Check-in 3 of 6." - two
 * past where she actually was, and disagreeing with every other reading of the same check-ins. It
 * now reads `mySessionNumber`, computed with the shared `whichSessionAreWeOn` rule (lib/which-
 * session-are-we-on.ts): the open session if there is one, otherwise the highest session number
 * actually completed - immune to a duplicate row.
 */
vi.mock('@/stores/auth', () => ({
  useAuthStore: (sel: any) => sel({ user: { id: 'u1', firstName: 'Esther', lastName: 'Wanjiru', email: 'esther@x.test' } }),
}))
vi.mock('@/api/grounds', () => ({
  groundsApi: {
    get: vi.fn(),
    getMySpecificity: vi.fn(),
    myTranscript: vi.fn(),
    myNotes: vi.fn(),
  },
}))
vi.mock('@/api/reports', () => ({ reportsApi: { get: vi.fn() } }))

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds/g1/p?tab=record']}>
        <Routes>
          <Route path="/grounds/:id/p" element={<GroundParticipantPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('a self-correction does not inflate "This is your session N of M"', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(reportsApi.get as any).mockResolvedValue(null)
    ;(groundsApi.getMySpecificity as any).mockResolvedValue(null)
    ;(groundsApi.myTranscript as any).mockResolvedValue({ sessions: [] })
    ;(groundsApi.myNotes as any).mockResolvedValue([])
  })

  it('reads the session actually open, not two completed rows for one corrected session', async () => {
    (groundsApi.get as any).mockResolvedValue({
      id: 'g1', label: 'Sales team, Q3', scenario: 'OKR_ALIGNMENT', status: 'OPEN',
      timelineDays: 180, cadence: 'DAILY', totalSessions: 6,
      participants: [{ id: 'p1', userId: 'u1', email: 'esther@x.test', partyType: 'PARTICIPANT', roleAsDescribed: null }],
      /* Session 1 completed, then self-corrected (a second completed row, same session number),
         and session 2 now open. The real position is "session 2 of 6", not "3 of 6". */
      checkIns: [
        { id: 'c1', participantId: 'p1', sessionNumber: 1, status: 'COMPLETED', completedAt: '2026-09-01T10:00:00.000Z', isSelfCorrection: false },
        { id: 'c1b', participantId: 'p1', sessionNumber: 1, status: 'COMPLETED', completedAt: '2026-09-01T11:00:00.000Z', isSelfCorrection: true },
        { id: 'c2', participantId: 'p1', sessionNumber: 2, status: 'IN_PROGRESS', completedAt: null, availableFrom: '2026-09-02T00:00:00.000Z' },
      ],
      signals: [],
    })
    renderPage()
    expect(await screen.findByText(/Check-in 2 of 6\./)).toBeTruthy()
    expect(screen.queryByText(/Check-in 3 of 6\./)).toBeNull()
  })

  it('and once every session is corrected shut with none open, reads the highest one actually finished', async () => {
    (groundsApi.get as any).mockResolvedValue({
      id: 'g1', label: 'Sales team, Q3', scenario: 'OKR_ALIGNMENT', status: 'OPEN',
      timelineDays: 180, cadence: 'DAILY', totalSessions: 6,
      participants: [{ id: 'p1', userId: 'u1', email: 'esther@x.test', partyType: 'PARTICIPANT', roleAsDescribed: null }],
      checkIns: [
        { id: 'c1', participantId: 'p1', sessionNumber: 1, status: 'COMPLETED', completedAt: '2026-09-01T10:00:00.000Z', isSelfCorrection: false },
        { id: 'c1b', participantId: 'p1', sessionNumber: 1, status: 'COMPLETED', completedAt: '2026-09-01T11:00:00.000Z', isSelfCorrection: true },
      ],
      signals: [],
    })
    renderPage()
    expect(await screen.findByText(/Check-in 1 of 6\./)).toBeTruthy()
  })
})
