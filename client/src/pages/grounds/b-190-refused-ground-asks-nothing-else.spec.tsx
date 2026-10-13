import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GroundParticipantPage } from './GroundParticipantPage'
import { groundsApi } from '@/api/grounds'
import { reportsApi } from '@/api/reports'

/**
 * B-190: A CHECK-IN THE READER MAY NOT OPEN, ON `/grounds/:id/p`, ASKED FOR MORE ANYWAY.
 *
 * Amani (a Msingi Foods member, not a party to Imani Hassan's first ninety days) opened
 * `/grounds/:id/p` for that check-in. `groundsApi.get` correctly answered 403 and the page showed
 * GroundGone ("This check-in isn't available any more"), which is deliberately silent on WHY
 * (GW-PRI-04: a 403 and a 404 must read the same, or a stranger holding a stale link learns that
 * something real sits behind it). But `getMySpecificity` was gated only on `!!id`, so it fired
 * anyway, got its own 403, and - unlike `groundsApi.get` - was never called with
 * `skipForbiddenToast`. The client's global 403 handler then threw up "That one is not yours to
 * open … whoever runs this check-in can let you in" right on top of the GroundGone panel: a second
 * message that contradicts the first and names exactly what GW-PRI-04 says never to name (that the
 * check-in exists and someone runs it).
 *
 * The fix gates `getMySpecificity` (and `getMyRecord`/`getMySoloReport`, which had the same shape)
 * on the ground having actually loaded, the same way `GroundAdminPage`'s matching three queries are
 * already gated on `viewerIsAParty` (itself derived from `ground`).
 */
vi.mock('@/stores/auth', () => ({
  useAuthStore: (sel: any) => sel({ user: { id: 'u-amani', firstName: 'Amani', lastName: 'Otieno', email: 'amani@msingi.test' } }),
}))
vi.mock('@/api/grounds', () => ({
  groundsApi: {
    get: vi.fn(),
    getMySpecificity: vi.fn(),
    getMyRecord: vi.fn(),
    getMySoloReport: vi.fn(),
    myTranscript: vi.fn(),
    myNotes: vi.fn(),
  },
}))
vi.mock('@/api/reports', () => ({ reportsApi: { get: vi.fn() } }))

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds/g1/p']}>
        <Routes>
          <Route path="/grounds/:id/p" element={<GroundParticipantPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('a check-in the reader may not open asks for nothing else on /p', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const refused = { response: { status: 403, data: {} } }
    ;(groundsApi.get as any).mockRejectedValue(refused)
    ;(groundsApi.getMySpecificity as any).mockRejectedValue(refused)
    ;(groundsApi.getMyRecord as any).mockRejectedValue(refused)
    ;(groundsApi.getMySoloReport as any).mockRejectedValue(refused)
    ;(reportsApi.get as any).mockRejectedValue(refused)
  })

  it('shows the one GroundGone message, and asks nothing about a specificity record', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText(/This check-in isn.t available any more/)).toBeTruthy())
    // The contradictory, privacy-leaking toast text must never appear alongside it.
    expect(screen.queryByText(/not yours to open/i)).toBeNull()
    expect(screen.queryByText(/whoever runs this check-in can let you in/i)).toBeNull()
    expect(groundsApi.getMySpecificity).not.toHaveBeenCalled()
    expect(groundsApi.getMyRecord).not.toHaveBeenCalled()
    expect(groundsApi.getMySoloReport).not.toHaveBeenCalled()
  })
})
