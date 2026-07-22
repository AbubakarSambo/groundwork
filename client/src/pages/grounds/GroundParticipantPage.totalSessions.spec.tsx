import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GroundParticipantPage } from './GroundParticipantPage'
import { groundsApi } from '@/api/grounds'
import { reportsApi } from '@/api/reports'

/**
 * Bug 8 guard: the participant view derived the session total from a
 * hardcoded `?? 6` fallback, so a 90-day MONTHLY ground (really 3 sessions)
 * showed "Session 1 of 6". It now derives floor(timelineDays / cadenceDays)
 * from the ground's own timelineDays + cadence, matching the create wizard.
 * Revert to `?? 6` -> a 90-day monthly ground shows "of 6" -> this bites.
 */

vi.mock('@/stores/auth', () => ({
  useAuthStore: (sel: any) => sel({ user: { id: 'u1', firstName: 'Jordan', lastName: 'Reyes', email: 'jordan@x.test' } }),
}))
vi.mock('@/api/grounds', () => ({
  groundsApi: { get: vi.fn(), getMySpecificity: vi.fn() },
}))
vi.mock('@/api/reports', () => ({ reportsApi: { get: vi.fn() } }))

function groundWith(timelineDays: number, cadence: string) {
  return {
    id: 'g1', label: 'Jordan - Probation', scenario: 'NEW_HIRE', status: 'OPEN',
    timelineDays, cadence,
    participants: [{ id: 'p1', userId: 'u1', email: 'jordan@x.test', partyType: 'PARTICIPANT', roleAsDescribed: null }],
    checkIns: [{ id: 'c1', participantId: 'p1', sessionNumber: 1, status: 'IN_PROGRESS', completedAt: null }],
    signals: [],
  }
}

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

describe('BUG8: participant view derives session total from timeline + cadence', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(reportsApi.get as any).mockResolvedValue(null)
    ;(groundsApi.getMySpecificity as any).mockResolvedValue(null)
  })

  it('a 90-day MONTHLY ground shows "of 3", not "of 6"', async () => {
    ;(groundsApi.get as any).mockResolvedValue(groundWith(90, 'MONTHLY'))
    renderPage()
    await waitFor(() => expect(screen.getByText(/Session 1 of 3/i)).toBeTruthy())
    expect(screen.queryByText(/of 6/i)).toBeNull()
  })

  it('a 90-day FORTNIGHTLY ground shows "of 6" (derived, not hardcoded)', async () => {
    ;(groundsApi.get as any).mockResolvedValue(groundWith(90, 'FORTNIGHTLY'))
    renderPage()
    await waitFor(() => expect(screen.getByText(/Session 1 of 6/i)).toBeTruthy())
  })

  it('a 30-day WEEKLY ground shows "of 4"', async () => {
    ;(groundsApi.get as any).mockResolvedValue(groundWith(30, 'WEEKLY'))
    renderPage()
    await waitFor(() => expect(screen.getByText(/Session 1 of 4/i)).toBeTruthy())
  })
})
