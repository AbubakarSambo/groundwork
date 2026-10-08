import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage } from './BoardPage'
import { boardApi } from '@/api/board'

/**
 * "LOADING" AND "IT DIDN'T LOAD" (F4-small-states/states.txt), AS THE BOARD READS THEM (U.20).
 *
 * The prototype's own words: "Getting the board" while it loads, and for a connection problem,
 * "The board didn't load" / "Nothing is lost; your check-ins are saved. It's usually the
 * connection." with "Try again". A failure the server can explain more specifically (403, 404, a
 * signed-out session) keeps its own true sentence (`why-you-cannot-see-this.ts`) instead - that
 * sentence would be wrong read as a connection problem, so the prototype's generic wording is only
 * drawn for the one case it is true of.
 */
vi.mock('@/stores/auth', () => ({
  useAuthStore: (sel: any) => sel({ user: { id: 'u1', firstName: 'Hafsah', role: 'ADMIN' } }),
}))
vi.mock('@/api/board', () => ({ boardApi: { get: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn().mockResolvedValue({}) } }))

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

describe('while the board is loading', () => {
  beforeEach(() => vi.clearAllMocks())

  it('says "Getting the board", not the page’s own earlier "Loading the board…"', () => {
    ;(boardApi.get as any).mockReturnValue(new Promise(() => {}))
    renderBoard()
    expect(screen.getByRole('status')).toHaveTextContent('Getting the board')
  })
})

describe('when the board fails to load', () => {
  beforeEach(() => vi.clearAllMocks())

  it('a connection problem reads the prototype’s own words, with a way to try again', async () => {
    ;(boardApi.get as any).mockRejectedValue(Object.assign(new Error('network'), { response: undefined }))
    const { container } = renderBoard()
    await waitFor(() => expect(container.textContent).toContain('The board didn’t load'))
    expect(screen.getByText('Nothing is lost; your check-ins are saved. It’s usually the connection.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy()
  })

  it('a 403 reads exactly like a 404 - B-110, GW-PRI-04: a stranger with a stale link must not be able to tell "never existed" from "exists, not yours"', async () => {
    ;(boardApi.get as any).mockRejectedValue(Object.assign(new Error('forbidden'), { response: { status: 403 } }))
    renderBoard()
    expect(await screen.findByRole('heading', { name: 'This check-in isn’t available any more' })).toBeTruthy()
    expect(screen.getByText(/Whoever ran it ended it or removed it\. What you wrote is kept in your own history\./)).toBeTruthy()
    expect(screen.queryByText('This record belongs to a check-in you are not part of.')).toBeNull()
    expect(screen.queryByText(/usually the connection/)).toBeNull()
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull()
  })

  it('a board that answers 404 is the prototype’s gone check-in, the same words for every cause', async () => {
    ;(boardApi.get as any).mockRejectedValue(Object.assign(new Error('not found'), { response: { status: 404, data: { message: 'Check-in not found' } } }))
    renderBoard()
    expect(await screen.findByRole('heading', { name: 'This check-in isn’t available any more' })).toBeTruthy()
    expect(screen.getByText(/Whoever ran it ended it or removed it\. What you wrote is kept in your own history\./)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Open my work' })).toHaveAttribute('href', '/you')
    expect(screen.getByRole('link', { name: 'Go to Check-ins' })).toHaveAttribute('href', '/grounds')
    expect(screen.queryByText(/Check-in not found/)).toBeNull()
  })
})
