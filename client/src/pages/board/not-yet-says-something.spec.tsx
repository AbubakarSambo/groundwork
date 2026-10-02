import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage } from './BoardPage'
import { boardApi } from '@/api/board'
import { apiClient } from '@/api/client'

/**
 * "NOT YET" MUST SAY SOMETHING.
 *
 * The engine sends `{ label: "Not yet", route: null }` for a choice that changes nothing. Pressing
 * it used to do and say nothing at all, which reads as a broken button. It now shows the action's
 * own `says` as a short note under the buttons, and saves nothing. A choice with no route and no
 * `says` sent for it is not drawn at all.
 */
vi.mock('@/stores/auth', () => ({
  useAuthStore: (sel: any) => sel({ user: { id: 'u1', firstName: 'Hafsah', role: 'ADMIN' } }),
}))
vi.mock('@/api/board', () => ({ boardApi: { get: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn().mockResolvedValue({ initiatorId: 'u1', participants: [] }) } }))
vi.mock('@/api/client', () => ({ apiClient: { request: vi.fn().mockResolvedValue({ data: {} }) } }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const board = (action: any) => ({
  groundId: 'g1',
  renders: true,
  mode: 'SHARED',
  family: 'UPDATE',
  sections: [],
  title: 'Harvestline sales and delivery',
  scenario: null,
  coverageVariant: 'NONE',
  myParticipantId: 'p1',
  canEditFrame: false,
  readOnlyNote: '',
  participants: [
    { id: 'p1', name: 'Hafsah', role: null, managingOnly: false, signedOffAt: null },
  ],
  leadActions: [
    { id: 'la1', says: 'Does the price list change count as sent?', because: null, action },
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

describe('pressing "Not yet"', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows the action\'s own says as a note, and saves nothing', async () => {
    ;(boardApi.get as any).mockResolvedValue(board({
      label: 'Open',
      says: 'Say whether it has happened. Until you do, it stays open on your work plan.',
      goesTo: null,
      choices: [
        { label: 'Yes, it counts', route: { method: 'POST', path: '/grounds/g1/commitments/1' } },
        { label: 'Not yet', route: null },
      ],
    }))
    renderBoard()
    const notYet = await screen.findByText('Not yet')
    expect(screen.queryByText('Say whether it has happened. Until you do, it stays open on your work plan.')).toBeNull()
    fireEvent.click(notYet)
    expect(await screen.findByText('Say whether it has happened. Until you do, it stays open on your work plan.')).toBeTruthy()
    expect(apiClient.request).not.toHaveBeenCalled()
  })

  it('does not draw a choice with no route and no says for it', async () => {
    ;(boardApi.get as any).mockResolvedValue(board({
      label: 'Open',
      goesTo: null,
      choices: [
        { label: 'Yes, it counts', route: { method: 'POST', path: '/grounds/g1/commitments/1' } },
        { label: 'Not yet', route: null },
      ],
    }))
    renderBoard()
    await screen.findByText('Yes, it counts')
    expect(screen.queryByText('Not yet')).toBeNull()
  })

  it('still runs a real choice normally, alongside a working "Not yet"', async () => {
    ;(boardApi.get as any).mockResolvedValue(board({
      label: 'Open',
      says: 'Say whether it has happened.',
      goesTo: null,
      choices: [
        { label: 'Yes, it counts', route: { method: 'POST', path: '/grounds/g1/commitments/1' } },
        { label: 'Not yet', route: null },
      ],
    }))
    renderBoard()
    const yes = await screen.findByText('Yes, it counts')
    fireEvent.click(yes)
    await waitFor(() => expect(apiClient.request).toHaveBeenCalled())
  })
})
