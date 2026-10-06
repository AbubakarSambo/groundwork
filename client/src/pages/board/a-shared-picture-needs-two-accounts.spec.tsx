import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage } from './BoardPage'
import { boardApi } from '@/api/board'

/**
 * A BOARD WITH ONE PERSON ON IT CANNOT PRODUCE A SHARED PICTURE, AND SAYS SO.
 *
 * The check-ins list carries this as a chip and a party's report tab carries it as a note. The
 * board - which IS the shared picture - carried nothing: "Nothing cross-referenced yet. This fills
 * in once more than one person has checked in", an empty grid, and a reader left to work out for
 * themselves that no amount of waiting would change it. The release rule refuses below two people.
 */
vi.mock('@/stores/auth', () => ({
  useAuthStore: (sel: any) => sel({ user: { id: 'u1', firstName: 'Hafsah', role: 'ADMIN' } }),
}))
vi.mock('@/api/board', () => ({ boardApi: { get: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn().mockResolvedValue({}) } }))

const board = (participants: any[], canEditFrame: boolean) => ({
  groundId: 'g1',
  renders: true,
  mode: 'SHARED',
  family: 'DELIVERY',
  sections: ['divergence'],
  title: 'The Kano sprint',
  /*
   * U.10 RE-REVIEW ITEM A: the switchboard now gates `divergence` per situation (see
   * what-the-switchboard-allows.ts), and 'TEAM_UPDATES' (family UPDATE) never turns on "Accounts
   * side by side" - this fixture's own `family: 'DELIVERY'` never matched it anyway. Changed to
   * 'OKR_ALIGNMENT', a real DELIVERY situation whose switchboard row carries "Accounts side by
   * side" as optional, which is what this test is actually about (one person, not this rule).
   */
  scenario: 'OKR_ALIGNMENT',
  coverageVariant: 'NONE',
  myParticipantId: 'p1',
  canEditFrame,
  readOnlyNote: '',
  participants,
  divergence: { items: [], agreements: [], centralQuestion: null, pointer: '' },
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

const one = [{ id: 'p1', name: 'Hafsah', role: null, managingOnly: false, signedOffAt: null }]
const two = [...one, { id: 'p2', name: 'Ada', role: null, managingOnly: false, signedOffAt: null }]

describe('a shared picture needs two accounts', () => {
  beforeEach(() => vi.clearAllMocks())

  it('tells the lead there is one person here, and that adding somebody is what changes it', async () => {
    ;(boardApi.get as any).mockResolvedValue(board(one, true))
    renderBoard()
    expect(await screen.findByText(/there is one person on this check-in/i)).toBeTruthy()
    expect(screen.getByText(/Add somebody and it will build/i)).toBeTruthy()
  })

  it('tells a party who cannot add anybody who can', async () => {
    ;(boardApi.get as any).mockResolvedValue(board(one, false))
    renderBoard()
    expect(await screen.findByText(/once the person running this check-in adds somebody/i)).toBeTruthy()
  })

  it('and says nothing at all once two people are on it', async () => {
    ;(boardApi.get as any).mockResolvedValue(board(two, true))
    renderBoard()
    expect(await screen.findByText(/Where people differ/i)).toBeTruthy()
    expect(screen.queryByText(/one person on this check-in/i)).toBeNull()
  })

  it('a managing-only lead is not the second account', async () => {
    ;(boardApi.get as any).mockResolvedValue(board([...one, { id: 'p9', name: 'Ada', role: null, managingOnly: true, signedOffAt: null }], true))
    renderBoard()
    expect(await screen.findByText(/there is one person on this check-in/i)).toBeTruthy()
  })
})
