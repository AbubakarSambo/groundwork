import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GroundParticipantPage } from './GroundParticipantPage'
import { groundsApi } from '@/api/grounds'
import { reportsApi } from '@/api/reports'

/**
 * U.8 FIFTH REVIEW: "THE SHARED REPORT COMPARES TWO ACCOUNTS... IT WILL BUILD ONCE SOMEBODY IS
 * ADDED" MUST NOT DEPEND ON `ground.participants`.
 *
 * On a check-in that hides peers from each other, `ground.participants` holds only the reader's own
 * row - the real shape the server sends. If the Report tab still counted that array (the old
 * `whoIsInRound(ground.participants, ...).length < 2`), a real team of four would read "It will
 * build once somebody is added" for ever, however many people are actually on it.
 * `atLeastTwoInThisRound` is the one fact this should be read from.
 */

vi.mock('@/stores/auth', () => ({
  useAuthStore: (sel: any) => sel({ user: { id: 'u-amani', firstName: 'Amani', lastName: 'Juma', email: 'amani@x.test' } }),
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

/** The real row shape a participant gets on a check-in that hides everyone else: only her own row. */
function amanisHiddenGround(atLeastTwoInThisRound: boolean) {
  return {
    id: 'g1', label: 'New hire, Amani', scenario: 'NEW_HIRE', status: 'OPEN',
    timelineDays: 90, cadence: 'WEEKLY',
    participants: [{ id: 'p-amani', userId: 'u-amani', email: 'amani@x.test', partyType: 'PARTICIPANT', roleAsDescribed: null }],
    checkIns: [{ id: 'c1', participantId: 'p-amani', sessionNumber: 1, status: 'IN_PROGRESS', completedAt: null }],
    signals: [],
    peersVisibleEffective: false,
    atLeastTwoInThisRound,
    viewerIsInitiator: false,
  }
}

function renderReportTab(ground: unknown) {
  ;(groundsApi.get as any).mockResolvedValue(ground)
  ;(groundsApi.getMySpecificity as any).mockResolvedValue(null)
  ;(groundsApi.myTranscript as any).mockResolvedValue({ sessions: [] })
  ;(groundsApi.myNotes as any).mockResolvedValue([])
  ;(reportsApi.get as any).mockResolvedValue(null)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds/g1/p?tab=report']}>
        <Routes>
          <Route path="/grounds/:id/p" element={<GroundParticipantPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('the Report tab, on a check-in that hides everyone else from each other', () => {
  beforeEach(() => vi.clearAllMocks())

  it('says nothing about needing a second person once atLeastTwoInThisRound is true, whatever participants holds', async () => {
    renderReportTab(amanisHiddenGround(true))
    // Wait for the tab's own content to settle before asserting an absence.
    await screen.findByText(/No report yet\.|Only you/i)
    expect(screen.queryByText(/The shared report compares two accounts/)).toBeNull()
  })

  it('still says so when atLeastTwoInThisRound is genuinely false', async () => {
    renderReportTab(amanisHiddenGround(false))
    expect(await screen.findByText(/The shared report compares two accounts/)).toBeTruthy()
    expect(screen.getByText(/It will build once the person running this check-in adds somebody/)).toBeTruthy()
  })
})
