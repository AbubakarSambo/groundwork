import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import EndingPage from './EndingPage'

/**
 * FAULT 3 (request, 6 October 2026, live walk): on a check-in that is already CLOSED, this page
 * still showed "How does this end?" with "Save the outcome and end it" - offering to end something
 * already over - whenever `theEndOfMonthRead` was not served (every check-in that is not an anchor
 * one, and an anchor one before its month has run). The cause: `ResolutionPanel` only knows a
 * check-in has ended once somebody has actually proposed and confirmed an outcome through its own
 * flow (`resolution.closedAt`); a ground can be CLOSED on its own record with no such proposal ever
 * made, and the panel had no way to be told that from here.
 *
 * The fix reads the ground's own status the same way `BoardPage.tsx` already does (`hasEnded`,
 * `lib/a-ground-that-has-ended.ts`) from the board response this page already fetches, and passes
 * `ResolutionPanel` its own read-only `place="board-top"` branch once the ground has ended - the
 * same one the board itself uses, which shows a recorded outcome in full or draws nothing - with
 * this page's own plain sentence filling the gap when nothing was ever recorded.
 */

vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn().mockResolvedValue({ id: 'g1', label: 'Help my team understand' }) } }))
vi.mock('@/api/suggestions', () => ({
  suggestionsApi: { listForLead: vi.fn().mockResolvedValue([]), listForPerson: vi.fn().mockResolvedValue([]) },
  isForTheLead: () => true,
}))

const mockResolutionGet = vi.fn()
vi.mock('@/api/resolution', () => ({ resolutionApi: { get: (...a: any[]) => mockResolutionGet(...a), propose: vi.fn() } }))

const mockBoardGet = vi.fn()
vi.mock('@/api/board', () => ({ boardApi: { get: (...a: any[]) => mockBoardGet(...a) } }))

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds/g1/end']}>
        <Routes>
          <Route path="/grounds/:id/end" element={<EndingPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  mockResolutionGet.mockReset()
  mockBoardGet.mockReset()
})

describe('a check-in that has already ended, with no outcome ever recorded through "decide how it ends"', () => {
  beforeEach(() => {
    mockBoardGet.mockResolvedValue({ groundId: 'g1', renders: true, canEditFrame: true, anchorScenarioOn: false, groundStatus: 'CLOSED' })
    // No resolution was ever proposed for this ground - exactly the anchor's own case, whose month
    // ends on its own clock rather than through this flow.
    mockResolutionGet.mockResolvedValue({
      resolution: null, confirmations: [], confirmedCount: 0, totalActive: 0, options: [], groundStatus: 'CLOSED',
      leadDecides: true, viewerIsLead: true, viewerIsParty: true,
    })
  })

  it('reads a plain sentence that it has ended, never "How does this end?" or an offer to end it', async () => {
    renderPage()
    expect(await screen.findByText('This check-in has ended.')).toBeTruthy()
    expect(screen.queryByText('How does this end?')).toBeNull()
    expect(screen.queryByText('Save the outcome and end it')).toBeNull()
  })

  it('gives a way back to the board', async () => {
    renderPage()
    await screen.findByText('This check-in has ended.')
    const link = screen.getByRole('link', { name: 'See the board' })
    expect(link.getAttribute('href')).toBe('/grounds/g1/board')
  })
})

describe('a check-in that ended through "decide how it ends", with an outcome on record', () => {
  it('shows the recorded outcome in full, not the plain fallback sentence', async () => {
    mockBoardGet.mockResolvedValue({ groundId: 'g1', renders: true, canEditFrame: true, anchorScenarioOn: false, groundStatus: 'CLOSED' })
    mockResolutionGet.mockResolvedValue({
      resolution: { endState: 'KEEP', closedAt: '2026-09-30T00:00:00.000Z', reason: 'He kept 17 of 19 commitments.' },
      confirmations: [{ participantId: 'p1', label: 'Wairimu', partyType: 'INITIATOR', endState: 'KEEP', confirmed: true }],
      confirmedCount: 1, totalActive: 1,
      options: [{ value: 'KEEP', label: 'Keep the hire' }],
      groundStatus: 'CLOSED', leadDecides: true, viewerIsLead: true, viewerIsParty: true,
    })
    renderPage()
    expect(await screen.findByText('How this ended')).toBeTruthy()
    expect(screen.getByText('Keep the hire')).toBeTruthy()
    expect(screen.queryByText('This check-in has ended.')).toBeNull()
    expect(screen.queryByText('How does this end?')).toBeNull()
  })
})

describe('a check-in that is still open', () => {
  it('still offers "How does this end?", unaffected by the fix', async () => {
    mockBoardGet.mockResolvedValue({ groundId: 'g1', renders: true, canEditFrame: true, anchorScenarioOn: false, groundStatus: 'ACTIVE' })
    mockResolutionGet.mockResolvedValue({
      resolution: null,
      confirmations: [{ participantId: 'p1', label: 'Wairimu', partyType: 'INITIATOR', endState: null, confirmed: false }],
      confirmedCount: 0, totalActive: 1,
      options: [{ value: 'KEEP', label: 'Keep the hire' }],
      groundStatus: 'ACTIVE', leadDecides: true, viewerIsLead: true, viewerIsParty: true,
    })
    renderPage()
    expect(await screen.findByText('How does this end?')).toBeTruthy()
    expect(screen.queryByText('This check-in has ended.')).toBeNull()
  })
})
