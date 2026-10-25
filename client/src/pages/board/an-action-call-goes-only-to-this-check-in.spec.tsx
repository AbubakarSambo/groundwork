import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage, isARouteToThisCheckIn } from './BoardPage'
import { boardApi } from '@/api/board'
import { apiClient } from '@/api/client'
import { toast } from 'sonner'

/**
 * AN ACTION CALL GOES ONLY TO THIS CHECK-IN.
 *
 * `useRunBoardAction` ran whatever method and path the server's `action.choices[].route` carried.
 * The server is trusted today, but nothing in the client checked that a route actually named this
 * check-in before sending it - an absolute URL, another ground's path, or a GET would have gone out
 * exactly like a correct route would. This checks the guard directly, and that pressing a button
 * with a bad route never reaches the network at all.
 */
vi.mock('@/stores/auth', () => ({
  useAuthStore: (sel: any) => sel({ user: { id: 'u1', firstName: 'Hafsah', role: 'ADMIN' } }),
}))
vi.mock('@/api/board', () => ({ boardApi: { get: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn().mockResolvedValue({ initiatorId: 'u1', participants: [] }) } }))
vi.mock('@/api/client', () => ({ apiClient: { request: vi.fn().mockResolvedValue({ data: {} }) } }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

describe('isARouteToThisCheckIn', () => {
  it('allows a POST to this check-in', () => {
    expect(isARouteToThisCheckIn('g1', { method: 'POST', path: '/grounds/g1/board/decisions/1/answer' })).toBe(true)
  })

  it('allows a PATCH to this check-in', () => {
    expect(isARouteToThisCheckIn('g1', { method: 'PATCH', path: '/grounds/g1/commitments/1' })).toBe(true)
  })

  it('refuses a GET', () => {
    expect(isARouteToThisCheckIn('g1', { method: 'GET' as any, path: '/grounds/g1/board/decisions/1/answer' })).toBe(false)
  })

  it('refuses an absolute URL', () => {
    expect(isARouteToThisCheckIn('g1', { method: 'POST', path: 'https://evil.example/grounds/g1/x' })).toBe(false)
  })

  it('refuses a scheme-relative URL', () => {
    expect(isARouteToThisCheckIn('g1', { method: 'POST', path: '//evil.example/grounds/g1/x' })).toBe(false)
  })

  it('refuses another check-in\'s path', () => {
    expect(isARouteToThisCheckIn('g1', { method: 'POST', path: '/grounds/g2/commitments/1' })).toBe(false)
  })

  it('refuses a path that climbs out with ..', () => {
    expect(isARouteToThisCheckIn('g1', { method: 'POST', path: '/grounds/g1/../g2/commitments/1' })).toBe(false)
  })

  it('refuses a path with no route at all', () => {
    expect(isARouteToThisCheckIn('g1', null)).toBe(false)
  })
})

const board = (route: { method: string; path: string } | null) => ({
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
    {
      id: 'la1',
      says: 'Does the price list change count as sent?',
      because: null,
      action: {
        label: 'Open',
        says: 'Say whether it has happened.',
        goesTo: null,
        choices: [{ label: 'Yes, it counts', route }],
      },
    },
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

describe('pressing a choice with a bad route', () => {
  beforeEach(() => vi.clearAllMocks())

  it('never sends an absolute URL, and says nothing was saved', async () => {
    ;(boardApi.get as any).mockResolvedValue(board({ method: 'POST', path: 'https://evil.example/grounds/g1/x' }))
    renderBoard()
    const button = await screen.findByText('Yes, it counts')
    fireEvent.click(button)
    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    expect(apiClient.request).not.toHaveBeenCalled()
    expect((toast.error as any).mock.calls[0][0]).toBe('That didn’t save. Try again.')
  })

  it('never sends a route to another ground', async () => {
    ;(boardApi.get as any).mockResolvedValue(board({ method: 'POST', path: '/grounds/g2/commitments/1' }))
    renderBoard()
    const button = await screen.findByText('Yes, it counts')
    fireEvent.click(button)
    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    expect(apiClient.request).not.toHaveBeenCalled()
  })

  it('never sends a GET', async () => {
    ;(boardApi.get as any).mockResolvedValue(board({ method: 'GET', path: '/grounds/g1/commitments/1' }))
    renderBoard()
    const button = await screen.findByText('Yes, it counts')
    fireEvent.click(button)
    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    expect(apiClient.request).not.toHaveBeenCalled()
  })

  it('does send a correct route to this check-in', async () => {
    ;(boardApi.get as any).mockResolvedValue(board({ method: 'POST', path: '/grounds/g1/commitments/1' }))
    renderBoard()
    const button = await screen.findByText('Yes, it counts')
    fireEvent.click(button)
    await waitFor(() => expect(apiClient.request).toHaveBeenCalled())
    expect(apiClient.request).toHaveBeenCalledWith(expect.objectContaining({ method: 'POST', url: '/grounds/g1/commitments/1' }))
  })
})
