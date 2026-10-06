import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GroundAdminPage } from './GroundAdminPage'
import { groundsApi } from '@/api/grounds'
import { reportsApi } from '@/api/reports'
import { documentsApi } from '@/api/documents'

/**
 * REVIEW ROUND 3, ITEM 5: NO "Remind" ON THE LEAD'S OWN ROW.
 *
 * The roster's Remind button read `isInitiator && myCheckIn?.id && status !== 'COMPLETED' &&
 * p.userId` - `myCheckIn` there is THAT ROW's own check-in (not the viewer's, despite the name),
 * so a lead whose own session was still open saw "Remind" beside her own name. There is nobody to
 * remind there but her.
 */
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn() } }))
vi.mock('@/api/participantRequests', () => ({ participantRequestsApi: { list: vi.fn().mockResolvedValue([]) } }))
vi.mock('@/api/reports', () => ({ reportsApi: { get: vi.fn() } }))
vi.mock('@/api/documents', () => ({ documentsApi: { list: vi.fn() } }))
vi.mock('@/api/resolution', () => ({ resolutionApi: { get: vi.fn().mockResolvedValue(null), propose: vi.fn() } }))
vi.mock('@/stores/auth', () => ({
  useAuthStore: (sel: any) => sel({ user: { id: 'u-lead', role: 'MEMBER', email: 'lead@x.test' }, isAuthenticated: true }),
}))

function ground() {
  return {
    id: 'g1', label: 'Sales team, Q3', status: 'ACTIVE', scenario: 'SALES', timelineDays: 90, cadence: 'WEEKLY',
    daysLeft: 40, viewerIsInitiator: true,
    participants: [
      { id: 'p-lead', userId: 'u-lead', email: 'lead@x.test', partyType: 'INITIATOR', roleAsDescribed: null },
      { id: 'p-other', userId: 'u-other', email: 'other@x.test', partyType: 'PARTICIPANT', roleAsDescribed: null },
    ],
    checkIns: [
      { id: 'ci-lead', participantId: 'p-lead', sessionNumber: 1, status: 'IN_PROGRESS', completedAt: null },
      { id: 'ci-other', participantId: 'p-other', sessionNumber: 1, status: 'IN_PROGRESS', completedAt: null },
    ],
    boardRenders: true,
  }
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds/g1']}>
        <Routes><Route path="/grounds/:id" element={<GroundAdminPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('the roster does not offer "Remind" for the lead herself', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(groundsApi.get as any).mockResolvedValue(ground())
    ;(reportsApi.get as any).mockResolvedValue(null)
    ;(documentsApi.list as any).mockResolvedValue([])
  })

  it('offers Remind for the other participant, not for her own row', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByRole('tab', { name: 'My work' })).toBeTruthy())
    fireEvent.click(screen.getByRole('tab', { name: 'My work' }))
    /* REVIEW ROUND 3, "YOUR WORK" REBUILD: "Sessions" is the "Who has answered" quiet link inside
       My work now, not a sub-tab. */
    fireEvent.click(await screen.findByRole('button', { name: 'Who has answered' }))
    const reminds = await screen.findAllByRole('button', { name: 'Remind' })
    expect(reminds).toHaveLength(1)
  })
})
