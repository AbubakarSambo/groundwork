import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GroundParticipantPage } from './GroundParticipantPage'
import { groundsApi } from '@/api/grounds'
import { reportsApi } from '@/api/reports'

/**
 * GROUP 3'S REVIEW, CONTRADICTION 5: THE SAME DATE, SAID TWICE, ONE OF THEM LESS TRUE.
 *
 * On the Check-in tab, between sessions, the header's "Your next session opens on 7 October." sat
 * right above BetweenCheckIns' own "Your next check-in opens on Wednesday 7 October at 3:30pm." -
 * the same fact, but the header's own version left out the weekday and the time. Said once, with
 * the fuller sentence, is enough.
 */
vi.mock('@/stores/auth', () => ({
  useAuthStore: (sel: any) => sel({ user: { id: 'u1', firstName: 'Amani', lastName: 'Wekesa', email: 'amani@x.test' } }),
}))
vi.mock('@/api/grounds', () => ({
  groundsApi: { get: vi.fn(), getMySpecificity: vi.fn(), myTranscript: vi.fn(), myNotes: vi.fn() },
}))
vi.mock('@/api/reports', () => ({ reportsApi: { get: vi.fn() } }))

const nextOpens = new Date(Date.now() + 7 * 86_400_000)
const GROUND = {
  id: 'g1', label: 'Sales team, Q3', scenario: 'SALES', status: 'OPEN',
  timelineDays: 90, cadence: 'WEEKLY', daysLeft: 72,
  participants: [{ id: 'p1', userId: 'u1', email: 'amani@x.test', partyType: 'PARTICIPANT' }],
  checkIns: [{ id: 'c1', participantId: 'p1', sessionNumber: 1, status: 'NOT_STARTED', completedAt: null, availableFrom: nextOpens.toISOString() }],
  signals: [],
}

function renderPage(query: string) {
  window.history.pushState({}, '', `/grounds/g1/p${query}`)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/grounds/g1/p${query}`]}>
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
  ;(groundsApi.get as any).mockResolvedValue(GROUND)
})

describe('the next-session date, on the Check-in tab where BetweenCheckIns already says it', () => {
  it('is said once, by BetweenCheckIns, not again by the header', async () => {
    renderPage('?tab=checkin')
    expect(await screen.findByText(/Your next check-in opens on/)).toBeTruthy()
    /* Said once: findByText above throws if two elements say it (the header's subtitle line and BetweenCheckIns). */
  })
})

describe('every other tab, where nothing else says the date', () => {
  it('Context still reads the header\'s own date', async () => {
    renderPage('?tab=context')
    expect(await screen.findByText(/Your next check-in opens on/)).toBeTruthy()
  })
})
