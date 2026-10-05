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

  it('a check-in that is not this reader’s keeps its own true sentence, not the connection wording', async () => {
    ;(boardApi.get as any).mockRejectedValue(Object.assign(new Error('forbidden'), { response: { status: 403 } }))
    const { container } = renderBoard()
    await waitFor(() => expect(container.textContent).toContain('This board could not be loaded.'))
    expect(screen.getByText('This record belongs to a check-in you are not part of.')).toBeTruthy()
    expect(screen.queryByText(/usually the connection/)).toBeNull()
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull()
  })
})
