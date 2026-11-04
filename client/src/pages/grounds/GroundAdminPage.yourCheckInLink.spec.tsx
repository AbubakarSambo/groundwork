import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GroundAdminPage } from './GroundAdminPage'
import { groundsApi } from '@/api/grounds'

/**
 * RE-REVIEW BUG: "YOUR CHECK-IN" IN THE HEADER LINKED TO THE BARE /grounds/:id.
 *
 * `/grounds/:id` is this very page - clicking the button while already on it did nothing a reader
 * could see. It should open the reader's own open session (/checkin/:id) directly when there is
 * one, or land on the Check-in tab otherwise; and it must not be shown at all to somebody who does
 * not answer this check-in themselves (an admin who is not a party).
 */
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn() } }))
vi.mock('@/api/participantRequests', () => ({ participantRequestsApi: { list: vi.fn().mockResolvedValue([]) } }))
vi.mock('@/api/reports', () => ({ reportsApi: { get: vi.fn() } }))
vi.mock('@/api/documents', () => ({ documentsApi: { list: vi.fn() } }))
vi.mock('@/api/resolution', () => ({ resolutionApi: { get: vi.fn().mockResolvedValue(null), propose: vi.fn() } }))
vi.mock('@/api/conversation', () => ({ conversationApi: { remind: vi.fn() } }))
vi.mock('@/api/billing', () => ({ billingApi: { status: vi.fn().mockResolvedValue(null), getContributorCodeShareCard: vi.fn() } }))
let currentUser: { id: string; role: string; email: string } = { id: 'u-lead', role: 'MEMBER', email: 'lead@x.test' }
vi.mock('@/stores/auth', () => ({
  useAuthStore: (sel: any) => sel({ user: currentUser, isAuthenticated: true }),
}))

function baseGround(over: Record<string, any> = {}) {
  return {
    id: 'g1', label: 'Sales team, Q3', status: 'ACTIVE', scenario: 'SALES', timelineDays: 90, cadence: 'FORTNIGHTLY',
    daysLeft: 40, overdue: 0, initiatorId: 'u-lead', viewerIsInitiator: true,
    participants: [
      { id: 'p-lead', userId: 'u-lead', email: 'lead@x.test', partyType: 'INITIATOR', user: { firstName: 'Wairimu', lastName: 'Kamau' } },
    ],
    checkIns: [],
    boardRenders: true,
    ...over,
  }
}

function renderPage(initialEntry = '/grounds/g1') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/grounds/:id" element={<GroundAdminPage />} />
          <Route path="/checkin/:checkInId" element={<div>The check-in itself</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('"Your check-in" in the header', () => {
  beforeEach(() => { currentUser = { id: 'u-lead', role: 'MEMBER', email: 'lead@x.test' } })


  it('is not shown to an admin who does not answer this check-in themselves', async () => {
    currentUser = { id: 'u-admin', role: 'ADMIN', email: 'admin@x.test' }
    ;(groundsApi.get as any).mockResolvedValue(baseGround({
      initiatorId: 'u-other', viewerIsInitiator: false,
      participants: [
        { id: 'p-lead', userId: 'u-other', email: 'other@x.test', partyType: 'INITIATOR', user: { firstName: 'Rukia' } },
      ],
    }))
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={['/grounds/g1']}>
          <Routes><Route path="/grounds/:id" element={<GroundAdminPage />} /></Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    await waitFor(() => {
      expect(screen.getAllByText((_c, el) => !!el?.textContent?.includes('You can read this check-in')).length).toBeGreaterThan(0)
    })
    expect(screen.queryByRole('button', { name: 'Your check-in' })).toBeNull()
  })

  it('opens the reader\'s own open session directly when there is one', async () => {
    ;(groundsApi.get as any).mockResolvedValue(baseGround({
      checkIns: [
        { id: 'ci-open', participantId: 'p-lead', sessionNumber: 1, status: 'IN_PROGRESS' },
      ],
    }))
    renderPage()
    const button = await screen.findByRole('button', { name: 'Your check-in' })
    await userEvent.click(button)
    expect(await screen.findByText('The check-in itself')).toBeTruthy()
  })

  it('goes to the Check-in tab when the reader has no open session right now', async () => {
    ;(groundsApi.get as any).mockResolvedValue(baseGround({ checkIns: [] }))
    renderPage()
    const button = await screen.findByRole('button', { name: 'Your check-in' })
    await userEvent.click(button)
    /* Changed in F5 (stage 11): the lead's Check-in tab with nothing open is "Check in yourself"; the ask box is gone (one Ask, from the header). */
    expect(await screen.findByRole('button', { name: 'Check in yourself' })).toBeTruthy()
  })

  /*
   * B-234: WITH NOTHING OPEN TO GO TO, THIS DID NOTHING A READER COULD SEE. Stalled, with no
   * `myOpenCheckInId`, pressing it just called `goTab('chat')` while Mira was already on the
   * Check-in tab - no request, nothing visible changed. Withheld here the same way Dov's own
   * "Start my check-in" is withheld once a check-in has stalled.
   */
  it('is not shown once the check-in has stalled', async () => {
    ;(groundsApi.get as any).mockResolvedValue(baseGround({ status: 'STALLED', checkIns: [] }))
    renderPage()
    await screen.findByRole('link', { name: 'board' })
    expect(screen.queryByRole('button', { name: 'Your check-in' })).toBeNull()
  })
})
