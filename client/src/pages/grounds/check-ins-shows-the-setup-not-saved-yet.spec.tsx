import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GroundsListPage } from './GroundsListPage'
import { useAuthStore } from '@/stores/auth'

/**
 * CHECK-INS SHOWS THE SETUP NOT SAVED YET, FROM THE SAME READER AS TODAY (Hafsah's blocker, 31 October 2026: "nothing anyone says in
 * setup is ever lost").
 *
 * Round 5's field programme lead left his setup unfinished. Today said "Finish setting up your check-in", Check-ins said "No check-ins
 * yet", and he went round the two for twenty steps believing his check-in had vanished, then rated it 1. Both pages read the lead's
 * setup kept on the server now, and Check-ins says what Today says, with the same way back.
 */
vi.mock('@/api/grounds', () => ({ groundsApi: { list: vi.fn(), awaitingApproval: vi.fn(), approve: vi.fn(), declineGround: vi.fn() } }))
vi.mock('@/api/entry', () => ({ entryApi: { unfinished: vi.fn() } }))
import { groundsApi } from '@/api/grounds'
import { entryApi } from '@/api/entry'

const AMA = { id: 'u-ama', firstName: 'Ama', role: 'ADMIN', organizationName: 'Mensah farmer training', mayOpenCheckIns: true }
const HIS_SETUP = {
  scenario: '', closed: false, onboardingStep: 3, history: [],
  onboardingSelections: { mode: 'new', initial: 'Tracking the effectiveness of farmer training and resource needs.' },
  onboardingHistory: [
    { role: 'assistant', content: 'Who is on the team delivering the training?' },
    { role: 'user', content: 'The field officers are Kwame Owusu, Akua Boateng, Kofi Nkrumah, and Adwoa Agyemang.' },
  ],
}

function open() {
  useAuthStore.setState({ user: AMA, token: 't', isAuthenticated: true } as any)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}><MemoryRouter initialEntries={['/grounds']}><GroundsListPage /></MemoryRouter></QueryClientProvider>)
}

describe('Check-ins, for a lead with a setup not saved yet', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(groundsApi.list).mockResolvedValue([] as any)
    vi.mocked(groundsApi.awaitingApproval).mockResolvedValue([] as any)
  })

  it('shows the setup with the way back, in his own words, and never says there are no check-ins', async () => {
    vi.mocked(entryApi.unfinished).mockResolvedValue(HIS_SETUP as any)
    open()
    expect(await screen.findByText('Finish setting up “Tracking the effectiveness of farmer training and resource needs”')).toBeTruthy()
    expect(screen.getByText('Everything you said is kept, and it opens where you left off.')).toBeTruthy()
    const carryOn = screen.getByRole('link', { name: 'Carry on' })
    expect(carryOn.getAttribute('href')).toBe('/start')
    expect(screen.getByText('Not saved yet')).toBeTruthy()
    expect(screen.queryByText('No check-ins yet')).toBeNull()
  })

  it('with nothing left unfinished, the empty list is as it was', async () => {
    vi.mocked(entryApi.unfinished).mockResolvedValue(null)
    open()
    expect(await screen.findByText('No check-ins yet')).toBeTruthy()
    expect(screen.queryByText(/Finish setting up/)).toBeNull()
  })
})
