import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GroundParticipantPage } from './GroundParticipantPage'
import { groundsApi } from '@/api/grounds'
import { reportsApi } from '@/api/reports'

/**
 * A TEAM MEMBER'S PEOPLE AND SETUP, ON THEIR OWN CHECK-IN PAGE (Release 1B, pull request 1 of 3). Mercy opens People and
 * setup on "Sales team, Q4". With Drop Access's switch on she reads only the short page the server serves her; with it off
 * she reads the tab exactly as before, and the new read is never asked for.
 */
vi.mock('@/stores/auth', () => ({
  useAuthStore: (sel: any) => sel({ user: { id: 'u-mercy', firstName: 'Mercy', lastName: 'Wanjiru', email: 'mercy@dropaccess.test' } }),
}))
vi.mock('@/api/grounds', () => ({
  groundsApi: { get: vi.fn(), getMySpecificity: vi.fn(), myTranscript: vi.fn(), myNotes: vi.fn(), peopleAndSetup: vi.fn() },
}))
vi.mock('@/api/reports', () => ({ reportsApi: { get: vi.fn() } }))

function theSalesCheckIn(release1bTabsOn: boolean) {
  return {
    id: 'g-sales', label: 'Sales team, Q4', scenario: 'OKR_ALIGNMENT', status: 'AWAITING_PARTIES', timelineDays: 15, cadence: 'DAILY',
    initiatorId: 'u-grace', release1bTabsOn,
    participants: [{ id: 'p-mercy', userId: 'u-mercy', email: 'mercy@dropaccess.test', partyType: 'PARTICIPANT', roleAsDescribed: null }],
    checkIns: [], signals: [],
  }
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds/g-sales/p?tab=people']}>
        <Routes><Route path="/grounds/:id/p" element={<GroundParticipantPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  ;(reportsApi.get as any).mockResolvedValue(null)
  ;(groundsApi.getMySpecificity as any).mockResolvedValue(null)
  ;(groundsApi.myTranscript as any).mockResolvedValue({ sessions: [] })
  ;(groundsApi.myNotes as any).mockResolvedValue([])
  ;(groundsApi.peopleAndSetup as any).mockResolvedValue({
    on: true, view: 'member', howItRuns: '5 people answer every weekday, until 30 October, on WhatsApp or here.',
    yourRole: 'Rep, Kiambu and schools', status: 'AWAITING_PARTIES', yourSessionsDone: 5, sessionsPlanned: 15, runsIt: 'Grace Achieng',
    whoSeesWhat: "Grace knows who is here. You see the team's report once it's shared, with names.",
  })
})

describe('Mercy opens People and setup on her own check-in page', () => {
  it('with the switch on, she reads her short page', async () => {
    ;(groundsApi.get as any).mockResolvedValue(theSalesCheckIn(true))
    renderPage()
    await screen.findByText('5 people answer every weekday, until 30 October, on WhatsApp or here.')
    expect(screen.getByText('Rep, Kiambu and schools')).toBeTruthy()
    expect(screen.getByText('You have completed 5 sessions, out of 15.')).toBeTruthy()
    expect(screen.getByText("Grace knows who is here. You see the team's report once it's shared, with names.")).toBeTruthy()
    expect(screen.queryByText('Setup')).toBeNull()
  })

  it('with the switch off, she reads the tab as before, and the new read is never asked for', async () => {
    ;(groundsApi.get as any).mockResolvedValue(theSalesCheckIn(false))
    renderPage()
    await waitFor(() => expect(screen.getByText('Setup')).toBeTruthy())
    expect(screen.getByText('Sessions completed')).toBeTruthy()
    expect(groundsApi.peopleAndSetup).not.toHaveBeenCalled()
    expect(screen.queryByText('5 people answer every weekday, until 30 October, on WhatsApp or here.')).toBeNull()
  })
})
