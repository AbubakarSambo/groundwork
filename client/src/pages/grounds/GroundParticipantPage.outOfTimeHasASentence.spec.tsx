import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GroundParticipantPage } from './GroundParticipantPage'
import { groundsApi } from '@/api/grounds'
import { reportsApi } from '@/api/reports'

/**
 * B-215 (review 5): Dov, on a stalled check-in's header (My work tab, so the full-page "Out of
 * time" hand-off does not take over), read the bare word "Out of time" with no sentence - unlike
 * every other state this line can be in ("Every session is done.", "This is your session 2 of 6.").
 * It now reads a full sentence.
 */
vi.mock('@/stores/auth', () => ({
  useAuthStore: (sel: any) => sel({ user: { id: 'u1', firstName: 'Dov', lastName: 'Katz', email: 'dov@x.test' } }),
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

function stalledGround() {
  return {
    id: 'g1', label: 'Dov - Probation', scenario: 'NEW_HIRE', status: 'STALLED',
    timelineDays: 90, cadence: 'MONTHLY',
    participants: [{ id: 'p1', userId: 'u1', email: 'dov@x.test', partyType: 'PARTICIPANT', roleAsDescribed: null }],
    checkIns: [{ id: 'c1', participantId: 'p1', sessionNumber: 1, status: 'COMPLETED', completedAt: '2026-09-01' }],
    signals: [],
  }
}

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

describe('B-215: the participant header gives a full sentence, not the bare word "Out of time"', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(reportsApi.get as any).mockResolvedValue(null)
    ;(groundsApi.getMySpecificity as any).mockResolvedValue(null)
    ;(groundsApi.myTranscript as any).mockResolvedValue({ sessions: [] })
    ;(groundsApi.myNotes as any).mockResolvedValue([])
  })

  it('reads a sentence explaining what "Out of time" means, not the bare phrase on its own', async () => {
    ;(groundsApi.get as any).mockResolvedValue(stalledGround())
    renderPage()
    await waitFor(() => expect(screen.getAllByText(/Dov - Probation/i).length).toBeGreaterThan(0))
    const sentence = await screen.findByText(/This check-in ran past the time it was given, so nobody can add to it for now\./i)
    expect(screen.queryByText('Out of time')).toBeNull()
    /*
     * B-215 (REVIEW 6): A STALLED CHECK-IN IS NOT A CHECK-IN THAT GENUINELY ENDED, so its sentence must never read green.
     * Changed 16 November 2026 (spacing work): the sentence used to be its own coloured span (amber for a stalled one). The 15 November
     * header commit made it the header's one subtitle line, in the header's own muted ink for every state, so the colour check no
     * longer has a span to read. What still matters is pinned: the sentence is in the header's subtitle, and it is not green.
     */
    expect(sentence.className).toContain('gw-pt-sub')
    expect(sentence.className).not.toContain('gwui-note-green')
  })

  /*
   * B-215 (REVIEW 6): "Start my check-in" WAS STILL OFFERED ON A CHECK-IN NOBODY CAN ADD TO.
   * `myOpenForAutoOpen` only asks whether Dov's own next session is not yet COMPLETED - it does not
   * ask whether the ground has stalled, so a STALLED ground whose last session is still open (the
   * actual shape a stall leaves behind: the clock ran out before anybody finished it) kept offering
   * this button. Pressing it could only ever fail. It is gone now while the ground is stalled; his
   * own Check-in tab still offers the real next step ("Ask Mira for more time", OutOfTime.tsx).
   */
  it('does not offer "Start my check-in" while the ground is stalled, even with a session still open', async () => {
    const openCheckIns = [{ id: 'c1', participantId: 'p1', sessionNumber: 1, status: 'NOT_STARTED', completedAt: null, availableFrom: new Date(Date.now() - 60_000).toISOString() }]
    ;(groundsApi.get as any).mockResolvedValue({
      ...stalledGround(),
      participants: [{ id: 'p1', userId: 'u1', email: 'dov@x.test', partyType: 'PARTICIPANT', roleAsDescribed: null, checkIns: openCheckIns }],
      checkIns: openCheckIns,
    })
    renderPage()
    await waitFor(() => expect(screen.getAllByText(/Dov - Probation/i).length).toBeGreaterThan(0))
    await screen.findByText(/This check-in ran past the time it was given, so nobody can add to it for now\./i)
    expect(screen.queryByRole('button', { name: 'Start my check-in' })).toBeNull()
  })
})
