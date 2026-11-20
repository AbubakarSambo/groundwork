import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage } from './BoardPage'
import { boardApi } from '@/api/board'

/**
 * A BOARD HELD BACK UNTIL YOU ANSWER IS NOT A BROKEN PAGE.
 *
 * The server has three answers about a board, and the page knew two. `renders: false` means this
 * check-in has no board at all. A full payload means here it is. The third is `renders: true` with
 * `withheldUntilYouCheckIn`: the board exists and is held back until the viewer has said their own
 * piece, so `false` would be untrue. Nothing else comes with it, no sections and no title.
 *
 * The page tested only `renders`, then read `sections.includes(...)`. So it threw "Cannot read
 * properties of undefined (reading 'includes')" and the whole Boards page went down with it.
 *
 * Seen on a real account with three stalled check-ins, which is exactly who this answer is for.
 * They were told the page could not load when nothing had gone wrong and the fix was one click.
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
        <Routes><Route path="/grounds/:id/board" element={<BoardPage />} /><Route path="/grounds/:id" element={<div>The check-in itself</div>} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('a board held back until you answer', () => {
  beforeEach(() => vi.clearAllMocks())

  it('says why, and does not fall over reading sections that were never sent', async () => {
    ;(boardApi.get as any).mockResolvedValue({
      groundId: 'g1',
      renders: true,
      withheldUntilYouCheckIn: true,
      mode: 'SHARED',
      family: 'DELIVERY',
      saying: 'Your own answer would be shaped by reading everybody else first.',
      /* No `sections`. This is the whole point: the server does not send them with this reply. */
    })

    renderBoard()

    expect(await screen.findByText(/Your own answer would be shaped/i)).toBeTruthy()
    /* THE REGRESSION: this is what the person actually saw. */
    expect(screen.queryByText(/could not load/i)).toBeNull()
    expect(screen.queryByText(/reading 'includes'/i)).toBeNull()
  })

  it('offers the one thing that unlocks it, rather than leaving them on a dead page', async () => {
    ;(boardApi.get as any).mockResolvedValue({
      groundId: 'g1', renders: true, withheldUntilYouCheckIn: true,
      mode: 'SHARED', family: 'DELIVERY', saying: 'Answer yours first.',
    })
    renderBoard()
    expect(await screen.findByRole('button', { name: /do my check-in/i })).toBeTruthy()
  })

  /* Changed 15 November 2026 (Hafsah): a check-in with no board has no board page. Whoever lands on the address is sent straight to
     the check-in (or the report, where there is one), and nothing is drawn or said in between. */
  it('sends somebody who lands on a check-in with no board straight to the check-in, with no page in between', async () => {
    ;(boardApi.get as any).mockResolvedValue({
      groundId: 'g1', renders: false, mode: 'PRIVATE', family: 'SENSING',
      reason: 'There is no board for this check-in yet.',
    })
    renderBoard()
    expect(await screen.findByText('The check-in itself')).toBeTruthy()
    expect(screen.queryByText(/No shared board here/i)).toBeNull()
  })
})
