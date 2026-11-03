import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage } from './BoardPage'
import { boardApi } from '@/api/board'
import { recommendedCheckInsApi } from '@/api/recommendedCheckIns'
import { groundsApi } from '@/api/grounds'

/**
 * "YOUR FULL REPORT IS READY IN A MOMENT." (Hafsah, 3 November evening). The lead lands on the board straight from "Send N invitations";
 * while the server says her report is still coming, she reads the line, and the board is read again until it lands.
 */
vi.mock('@/api/board', () => ({ boardApi: { get: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn() } }))
vi.mock('@/api/recommendedCheckIns', () => ({
  recommendedCheckInsApi: { list: vi.fn(), yes: vi.fn(), notNow: vi.fn(), draftFromSetUp: vi.fn() },
}))

const navigated = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => navigated }
})

/* `currentUser` is read by the mocked store's selector at CALL time, not at mock-registration
   time, so each test can switch between the lead and a participant just by setting this before
   rendering - no need for `vi.doMock` to fight the module graph's static imports. */
let currentUser: { id: string; firstName: string; role: string } = { id: 'u1', firstName: 'Hafsah', role: 'ADMIN' }
vi.mock('@/stores/auth', () => ({
  useAuthStore: (sel: any) => sel({ user: currentUser }),
}))

const board = () => ({
  groundId: 'g1',
  renders: true,
  mode: 'SHARED',
  family: 'UPDATE',
  sections: [],
  title: 'Conveyancing, weekly',
  scenario: null,
  coverageVariant: 'NONE',
  myParticipantId: 'p1',
  canEditFrame: false,
  readOnlyNote: '',
  participants: [
    { id: 'p1', name: 'Hafsah', role: null, managingOnly: false, signedOffAt: null },
    { id: 'p2', name: 'Kennedy', role: null, managingOnly: false, signedOffAt: null },
  ],
})

function renderBoard() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds/g1/board']}>
        <Routes><Route path="/grounds/:id/board" element={<BoardPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => { vi.clearAllMocks() })

describe('the lead, straight after sending the invitations', () => {
  it('reads that her full report is ready in a moment, and then the board without it once it lands', async () => {
    ;(boardApi.get as any).mockResolvedValueOnce({ ...board(), fullReportComing: 'Your full report is ready in a moment.' }).mockResolvedValue(board())
    ;(groundsApi.get as any).mockResolvedValue({ initiatorId: 'u1', participants: [] })
    ;(recommendedCheckInsApi.list as any).mockResolvedValue({ offers: [] })
    renderBoard()
    expect(await screen.findByText('Your full report is ready in a moment.')).toBeTruthy()
    await waitFor(() => expect(screen.queryByText('Your full report is ready in a moment.')).toBeNull(), { timeout: 8000 })
  }, 15000)

  it('reads nothing of the sort on a board the server does not say it for', async () => {
    ;(boardApi.get as any).mockResolvedValue(board())
    ;(groundsApi.get as any).mockResolvedValue({ initiatorId: 'u1', participants: [] })
    ;(recommendedCheckInsApi.list as any).mockResolvedValue({ offers: [] })
    renderBoard()
    await screen.findAllByText('Conveyancing, weekly')
    expect(screen.queryByText('Your full report is ready in a moment.')).toBeNull()
  })
})
