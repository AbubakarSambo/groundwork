import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GroundParticipantPage } from './GroundParticipantPage'
import { groundsApi } from '@/api/grounds'
import { reportsApi } from '@/api/reports'

/**
 * AN ADMIN WHO IS NOT IN THE CHECK-IN, AND DOES NOT RUN IT (U.20 review). The page said "You run it
 * as an admin", which was untrue: Wairimu runs it. It now names who does, and says the admin can
 * read all of it. An admin who did open it still reads that they run it.
 */
vi.mock('@/stores/auth', () => ({
  useAuthStore: (sel: any) => sel({ user: { id: 'u-outside', role: 'ADMIN', firstName: 'Juma', lastName: 'Kariuki', email: 'juma@x.test' } }),
}))
vi.mock('@/api/grounds', () => ({
  groundsApi: { get: vi.fn(), getMySpecificity: vi.fn(), myTranscript: vi.fn(), myNotes: vi.fn() },
}))
vi.mock('@/api/reports', () => ({ reportsApi: { get: vi.fn() } }))
vi.mock('@/api/participantRequests', () => ({ participantRequestsApi: { create: vi.fn() } }))

const GROUND = {
  id: 'g1', label: 'Sales team, Q3', scenario: 'OKR_ALIGNMENT', status: 'ACTIVE',
  leadFirstName: 'Wairimu',
  participants: [{ id: 'p1', userId: 'u-lead', email: 'wairimu@baridi.co.ke', partyType: 'INITIATOR', roleAsDescribed: null }],
  checkIns: [],
  signals: [],
}

function renderPage() {
  ;(groundsApi.get as any).mockResolvedValue(GROUND)
  ;(reportsApi.get as any).mockResolvedValue(null)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds/g1/p']}>
        <Routes><Route path="/grounds/:id/p" element={<GroundParticipantPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('an admin who is not in this check-in', () => {
  beforeEach(() => vi.clearAllMocks())

  it('names who runs it, and never says the admin does', async () => {
    renderPage()
    expect(await screen.findByRole('heading', { name: 'You’re not in this check-in' })).toBeTruthy()
    expect(screen.getByText('Wairimu runs it. You can read all of it as an admin, on the whole check-in.')).toBeTruthy()
    expect(screen.queryByText(/You run it/)).toBeNull()
    expect(screen.getByRole('button', { name: 'Open the whole check-in' })).toBeTruthy()
  })

  it('an admin who opened it still reads that they run it', async () => {
    ;(groundsApi.get as any).mockResolvedValue({ ...GROUND, initiatorId: 'u-outside' })
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/grounds/g1/p']}>
          <Routes><Route path="/grounds/:id/p" element={<GroundParticipantPage />} /></Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(await screen.findByText(/You run it as an admin without giving a check-in yourself\./)).toBeTruthy()
  })
})
