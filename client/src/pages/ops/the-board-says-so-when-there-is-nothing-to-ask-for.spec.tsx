/**
 * THE STAFF BOARD NEVER SITS ON "LOADING" WITH NOTHING ASKED (end-to-end check of 17 November, staff My board).
 * With no period in the system, or no board for the person, no request is sent; the page now says why.
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import OpsBoardPage from './OpsBoardPage'

const board = vi.fn()
vi.mock('@/api/ops', () => ({
  opsApi: {
    me: vi.fn(async () => ({ name: 'Staff', key: 'staff' })),
    boards: vi.fn(async () => ({ lands: 'ceo', boards: [{ key: 'ceo', name: 'Running the company', yours: true }] })),
    periods: vi.fn(async () => []),
    board: (...a: unknown[]) => board(...a),
  },
}))

describe('the staff board with no period in the system', () => {
  it('says there is no period, and asks for no board', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={qc}><OpsBoardPage /></QueryClientProvider>)
    expect(await screen.findByText(/No period has been set up yet, so there is no board to show/)).toBeTruthy()
    expect(screen.queryByText('Loading')).toBeNull()
    expect(board).not.toHaveBeenCalled()
  })
})
