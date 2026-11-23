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
/* My work is the B7 page for everybody (batch 1, group 10), drawn from the server's answer; "Who has answered" is under it. */
vi.mock('@/api/grounds', async () => {
  const { SERVED_TO_THE_LEAD } = await import('./my-work-served.fixture')
  return { groundsApi: { get: vi.fn(), myWork: vi.fn().mockResolvedValue(SERVED_TO_THE_LEAD) } }
})
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
    /* REVIEW ROUND 3, "YOUR WORK" REBUILD: "Sessions" is the "Who has answered" quiet link inside
       My work now, not a sub-tab.
       FAULT 3 FIX, 6 Oct 2026: a lead who is also a party (as here) now lands straight on the
       roster when she clicks "My work" - the same destination the board's own "My work" link
       already used - so the extra click through "Who has answered" is gone with the bug it
       worked around. See `myWorkDefault` in GroundAdminPage.tsx. */
    fireEvent.click(screen.getByRole('tab', { name: 'My work' }))
    /* Batch 1, group 10: "My work" opens the B7 page for a lead too, from every tab row, so the roster is one press further,
       behind "Who has answered" inside it (it was the lead's landing while Release 1B's switch was off). */
    fireEvent.click(await screen.findByRole('button', { name: 'Who has answered' }))
    /* On People and setup's one list now (page audit, 24 November 2026, row 8), in each row's "···". */
    const reminds = await screen.findAllByRole('button', { name: 'Send them a reminder', hidden: true })
    expect(reminds).toHaveLength(1)
  })
})
