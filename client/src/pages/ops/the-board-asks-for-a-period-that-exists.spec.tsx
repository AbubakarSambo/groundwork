/**
 * THE STAFF BOARD ASKS FOR A PERIOD THAT EXISTS (end-to-end check of 16 November, M-9; fix plan 17 November, group E).
 *
 * The board page asked for 'sept-2026-target-list', a key written into the page. In a system without that period the server answered
 * "No period called ..." (404) on every ops page for staff. It now waits for the periods and asks for the first one, the period that
 * holds today, and asks for nothing while there is none.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import OpsBoardPage from './OpsBoardPage'

const board = vi.fn(async (_key: string, _period: string) => ({ key: 'ceo', name: 'Running the company', answers: 'x', numbers: [], personalPanels: [] }))
vi.mock('@/api/ops', () => ({
  opsApi: {
    me: vi.fn(async () => ({ name: 'Staff' })),
    boards: vi.fn(async () => ({ lands: 'ceo', boards: [{ key: 'ceo', name: 'Running the company', yours: true }] })),
    periods: vi.fn(async () => [{ key: 'nov-2026', name: 'November 2026', kind: 'MONTH' }, { key: 'sept-2026-target-list', name: 'September', kind: 'TARGET_LIST' }]),
    board: (k: string, p: string) => board(k, p),
  },
}))

describe('the staff board', () => {
  beforeEach(() => board.mockClear())
  it('asks for the first period the system lists, never a period written into the page', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={qc}><OpsBoardPage /></QueryClientProvider>)
    await waitFor(() => expect(board).toHaveBeenCalled())
    expect(board).toHaveBeenCalledWith('ceo', 'nov-2026')
    expect(board).not.toHaveBeenCalledWith('ceo', '')
  })
})
