import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage } from './BoardPage'
import { boardApi } from '@/api/board'
import { groundsApi } from '@/api/grounds'
import { recommendedCheckInsApi } from '@/api/recommendedCheckIns'

/**
 * ANCHOR PIECE 22, A PERSON'S OWN RECOGNITION SENTENCE, "Helping the team move"
 * (docs/anchor-scenario.md section 19; docs/answers-from-engine.md, "Anchor piece 22, hidden
 * contributors, is served"). Hafsah's decision: a person reads the same sentence the lead reads
 * about them, said as "you". Served only to that person, only for an anchor check-in - `null` when
 * they have closed nothing, absent otherwise - and the lead's own board (TheMonthBoard) is unchanged.
 */
vi.mock('@/api/board', () => ({ boardApi: { get: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn() } }))
vi.mock('@/api/recommendedCheckIns', () => ({
  recommendedCheckInsApi: { list: vi.fn().mockResolvedValue({ offers: [] }), yes: vi.fn(), notNow: vi.fn() },
}))

let currentUser: { id: string; firstName: string; role: string } = { id: 'u1', firstName: 'Hafsah', role: 'ADMIN' }
vi.mock('@/stores/auth', () => ({
  useAuthStore: (sel: any) => sel({ user: currentUser }),
}))

const board = (yourPartInMovingThings?: string | null) => ({
  groundId: 'g1',
  renders: true,
  mode: 'SHARED',
  family: 'UPDATE',
  sections: [],
  title: 'Help my team understand',
  scenario: null,
  coverageVariant: 'NONE',
  myParticipantId: 'p1',
  canEditFrame: false,
  readOnlyNote: '',
  eachPerson: [],
  ...(yourPartInMovingThings !== undefined ? { yourPartInMovingThings } : {}),
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

beforeEach(() => {
  vi.clearAllMocks()
  ;(recommendedCheckInsApi.list as any).mockResolvedValue({ offers: [] })
  currentUser = { id: 'u2', firstName: 'Kennedy', role: 'MEMBER' }
})

describe('a person\'s own recognition sentence, "Helping the team move"', () => {
  it('draws the engine\'s own sentence, word for word, under its heading', async () => {
    ;(boardApi.get as any).mockResolvedValue(
      board('You committed to send your manager the deck, and you say it is done.'),
    )
    ;(groundsApi.get as any).mockResolvedValue({ initiatorId: 'u1', participants: [] })
    renderBoard()
    expect(await screen.findByRole('heading', { name: 'Helping the team move' })).toBeTruthy()
    expect(screen.getByText('You committed to send your manager the deck, and you say it is done.')).toBeTruthy()
  })

  it('draws no heading when the sentence is null - nothing closed this month', async () => {
    ;(boardApi.get as any).mockResolvedValue(board(null))
    ;(groundsApi.get as any).mockResolvedValue({ initiatorId: 'u1', participants: [] })
    renderBoard()
    await screen.findByRole('heading', { name: 'Help my team understand' })
    expect(screen.queryByRole('heading', { name: 'Helping the team move' })).toBeNull()
  })

  it('draws no heading when the field is absent - any other check-in, or the switch off', async () => {
    ;(boardApi.get as any).mockResolvedValue(board())
    ;(groundsApi.get as any).mockResolvedValue({ initiatorId: 'u1', participants: [] })
    renderBoard()
    await screen.findByRole('heading', { name: 'Help my team understand' })
    expect(screen.queryByRole('heading', { name: 'Helping the team move' })).toBeNull()
  })

  it("draws nothing for the lead - the lead's own board is unchanged", async () => {
    currentUser = { id: 'u1', firstName: 'Hafsah', role: 'ADMIN' }
    ;(boardApi.get as any).mockResolvedValue(
      board('You committed to send your manager the deck, and you say it is done.'),
    )
    ;(groundsApi.get as any).mockResolvedValue({ initiatorId: 'u1', participants: [] })
    renderBoard()
    await screen.findByRole('heading', { name: 'Help my team understand' })
    expect(screen.queryByRole('heading', { name: 'Helping the team move' })).toBeNull()
    expect(screen.queryByText('You committed to send your manager the deck, and you say it is done.')).toBeNull()
  })
})
