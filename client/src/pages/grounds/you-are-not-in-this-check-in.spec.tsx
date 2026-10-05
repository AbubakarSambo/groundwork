import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GroundParticipantPage } from './GroundParticipantPage'
import { groundsApi } from '@/api/grounds'
import { reportsApi } from '@/api/reports'
import { participantRequestsApi } from '@/api/participantRequests'

/**
 * "NOT IN THIS CHECK-IN" (F4-small-states/states.txt): "You're not in this check-in" /
 * "<lead> runs it and can add you." / "Ask to join" (U.20).
 *
 * "Ask to join" is not drawn yet: the server lets only somebody already in a check-in ask to add
 * someone, so the button could only fail (U.20 review; request 159). These tests used to mock that
 * request as a success, which tested nothing real.
 */
vi.mock('@/stores/auth', () => ({
  useAuthStore: (sel: any) => sel({ user: { id: 'u-outside', role: 'MEMBER', firstName: 'Jordan', lastName: 'Reyes', email: 'jordan@x.test' } }),
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

describe('somebody who is not a party to this check-in', () => {
  beforeEach(() => vi.clearAllMocks())

  it('reads the prototype’s own words, naming who runs it', async () => {
    renderPage()
    expect(await screen.findByRole('heading', { name: 'You’re not in this check-in' })).toBeTruthy()
    expect(screen.getByText('Wairimu runs it and can add you.')).toBeTruthy()
  })

  it('offers no "Ask to join" while the server would refuse it, and sends nothing', async () => {
    renderPage()
    await screen.findByRole('heading', { name: 'You’re not in this check-in' })
    expect(screen.queryByRole('button', { name: 'Ask to join' })).toBeNull()
    expect(participantRequestsApi.create).not.toHaveBeenCalled()
  })
})
