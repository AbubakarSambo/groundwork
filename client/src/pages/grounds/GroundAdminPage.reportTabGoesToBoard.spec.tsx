import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GroundAdminPage } from './GroundAdminPage'
import { groundsApi } from '@/api/grounds'

/**
 * GROUP 3'S REVIEW, CONTRADICTION 1: "?tab=report" NOW REACHES THE REPORTS IT PROMISES.
 *
 * A read-only admin's page says "You can read this check-in's board and reports." - true, since
 * the Board page lists every session with an "Open" link to its report - but a link carrying
 * `?tab=report` used to land this reader on Context instead, where neither word in that sentence
 * is true of anything on screen. `?tab=report` is this reader's own request for the reports, so it
 * now sends them to the one place among their three tabs that actually has them: the Board page.
 *
 * HAFSAH, 10 OCTOBER (B-143): `?tab=checkins` now goes to the Board page too, not Context. The
 * second deep page audit found that a read-only admin opening a check-in landed on Context and
 * resources, though the board is what they are there to read; Hafsah's answer was to land this
 * reader on the Board whenever they are not sent somewhere more specific, so every one of their
 * redirected cases - the default landing, `report`, `checkins` and `myrecord` - now goes there.
 */
vi.mock('@/stores/auth', () => ({
  useAuthStore: (sel: any) => sel({ user: { id: 'u-admin', role: 'ADMIN', email: 'admin@x.test' }, isAuthenticated: true }),
}))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn() } }))
vi.mock('@/api/participantRequests', () => ({ participantRequestsApi: { list: vi.fn().mockResolvedValue([]) } }))
vi.mock('@/api/reports', () => ({ reportsApi: { get: vi.fn() } }))
vi.mock('@/api/documents', () => ({ documentsApi: { list: vi.fn() } }))
vi.mock('@/api/resolution', () => ({ resolutionApi: { get: vi.fn().mockResolvedValue(null), propose: vi.fn() } }))
vi.mock('@/api/conversation', () => ({ conversationApi: { remind: vi.fn() } }))
vi.mock('@/api/billing', () => ({ billingApi: { status: vi.fn().mockResolvedValue(null), getContributorCodeShareCard: vi.fn() } }))

function readOnlyGround(over: Record<string, any> = {}) {
  return {
    id: 'g1', label: 'Sales team, Q3', status: 'ACTIVE', scenario: 'SALES', timelineDays: 90, cadence: 'FORTNIGHTLY',
    daysLeft: 40, overdue: 2, initiatorId: 'u-lead',
    participants: [
      { id: 'p-lead', userId: 'u-lead', email: 'lead@x.test', partyType: 'INITIATOR', user: { firstName: 'Wairimu', lastName: 'Kamau' } },
      { id: 'p2', userId: 'u2', email: 'other@x.test', partyType: 'PARTICIPANT' },
    ],
    checkIns: [],
    boardRenders: true,
    ...over,
  }
}

function renderPage(initialPath: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/grounds/:id" element={<GroundAdminPage />} />
          <Route path="/grounds/:id/board" element={<div>the board page itself</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('a read-only admin arriving on ?tab=report', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(groundsApi.get as any).mockResolvedValue(readOnlyGround())
  })

  it('is sent to the Board page, which is where their reports actually are', async () => {
    renderPage('/grounds/g1?tab=report')
    expect(await screen.findByText('the board page itself')).toBeTruthy()
  })

  it('now lands on the Board page for ?tab=checkins too (Hafsah, 10 October, B-143)', async () => {
    renderPage('/grounds/g1?tab=checkins')
    expect(await screen.findByText('the board page itself')).toBeTruthy()
  })
})
