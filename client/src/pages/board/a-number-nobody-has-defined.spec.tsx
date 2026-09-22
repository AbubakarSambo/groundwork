import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage } from './BoardPage'
import { boardApi } from '@/api/board'

/**
 * A NUMBER NOBODY HAS DEFINED IS NOT AN AGREED NUMBER.
 *
 * "signed 12m" sat on the board as settled while the lead's own note, one page away, said nobody had
 * decided whether the 12m is signed revenue or recognised revenue, and that finance counts
 * collection where sales counts booked. Both facts were in the product, 22 September 2026, and only
 * one of them was anywhere near the number.
 */
vi.mock('@/stores/auth', () => ({
  useAuthStore: (sel: any) => sel({ user: { id: 'u1', firstName: 'Hafsah', role: 'ADMIN' } }),
}))
vi.mock('@/api/board', () => ({ boardApi: { get: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn().mockResolvedValue({}) } }))

const board = (notSettled: string | null) => ({
  groundId: 'g1',
  renders: true,
  mode: 'SHARED',
  family: 'UPDATE',
  sections: ['objectives'],
  title: 'Harvestline sales and delivery',
  scenario: 'TEAM_UPDATES',
  coverageVariant: 'NONE',
  myParticipantId: 'p1',
  canEditFrame: true,
  readOnlyNote: '',
  participants: [
    { id: 'p1', name: 'Hafsah', role: null, managingOnly: false, signedOffAt: null },
    { id: 'p2', name: 'Amina', role: null, managingOnly: false, signedOffAt: null },
  ],
  objectives: [
    { id: 'o1', name: 'signed', count: 7_800_000, prevCount: 0, target: 12_000_000, delta: 0, isNew: false, askedOf: null, suggestedCount: null, notSettled },
    { id: 'o2', name: 'new paying customers', count: 2, prevCount: 0, target: 6, delta: 0, isNew: false, askedOf: null, suggestedCount: null, notSettled: null },
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

describe('a number nobody has defined', () => {
  beforeEach(() => vi.clearAllMocks())

  it('says so on the row, in the lead\'s own words', async () => {
    ;(boardApi.get as any).mockResolvedValue(board('The 12m target may be signed or recognised revenue, nobody has said which.'))
    renderBoard()
    expect(await screen.findByText('definition not settled')).toBeTruthy()
    expect(screen.getByText(/may be signed or recognised revenue/)).toBeTruthy()
    /* The number is still there: this says something about it, it does not hide it. */
    expect(screen.getByText(/of 12000000|12000000/)).toBeTruthy()
  })

  it('and says nothing on a target nobody disputes', async () => {
    ;(boardApi.get as any).mockResolvedValue(board(null))
    renderBoard()
    expect(await screen.findByText('new paying customers')).toBeTruthy()
    expect(screen.queryByText('definition not settled')).toBeNull()
  })
})
