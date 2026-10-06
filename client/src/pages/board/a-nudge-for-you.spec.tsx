import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage } from './BoardPage'
import { boardApi } from '@/api/board'
import { groundsApi } from '@/api/grounds'
import { recommendedCheckInsApi } from '@/api/recommendedCheckIns'

/**
 * ANCHOR PIECE 30, THE NUDGE (docs/anchor-scenario.md section 26; docs/answers-from-engine.md,
 * "Anchor piece 30, the nudge, is built"). Served to a person in an anchor check-in who has not yet
 * checked in for the open round, as Groundwork speaking to them directly - the served sentence,
 * then a button to their check-in. `null` once they have checked in, absent otherwise, and never
 * served to the lead.
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

const NUDGE = "You mentioned you would send your manager the deck. I'd love to hear how it went."

const board = (aNudgeForYou?: string | null) => ({
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
  ...(aNudgeForYou !== undefined ? { aNudgeForYou } : {}),
  participants: [
    { id: 'p1', name: 'Rukia', role: null, managingOnly: false, signedOffAt: null },
    { id: 'p2', name: 'Amina', role: null, managingOnly: false, signedOffAt: null },
  ],
})

function renderBoard() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds/g1/board']}>
        <Routes>
          <Route path="/grounds/:id/board" element={<BoardPage />} />
          <Route path="/grounds/:id" element={<div>The check-in’s own page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  ;(recommendedCheckInsApi.list as any).mockResolvedValue({ offers: [] })
  currentUser = { id: 'u2', firstName: 'Rukia', role: 'MEMBER' }
})

describe('the nudge, anchor piece 30', () => {
  it('draws the engine\'s own sentence, word for word, with a button to the check-in', async () => {
    ;(boardApi.get as any).mockResolvedValue(board(NUDGE))
    ;(groundsApi.get as any).mockResolvedValue({ initiatorId: 'u1', participants: [] })
    renderBoard()
    expect(await screen.findByText(NUDGE)).toBeTruthy()
    const button = screen.getAllByRole('button', { name: 'Start my check-in' })[0]
    expect(button).toBeTruthy()
    fireEvent.click(button)
    expect(await screen.findByText('The check-in’s own page')).toBeTruthy()
  })

  it('draws nothing when the nudge is null - they have already checked in', async () => {
    ;(boardApi.get as any).mockResolvedValue(board(null))
    ;(groundsApi.get as any).mockResolvedValue({ initiatorId: 'u1', participants: [] })
    renderBoard()
    await screen.findByRole('heading', { name: 'Help my team understand' })
    expect(screen.queryByText(NUDGE)).toBeNull()
  })

  it('draws nothing when the field is absent - any other check-in, or the switch off', async () => {
    ;(boardApi.get as any).mockResolvedValue(board())
    ;(groundsApi.get as any).mockResolvedValue({ initiatorId: 'u1', participants: [] })
    renderBoard()
    await screen.findByRole('heading', { name: 'Help my team understand' })
    expect(screen.queryByText(NUDGE)).toBeNull()
  })

  it("draws nothing for the lead - the lead is never served a nudge", async () => {
    currentUser = { id: 'u1', firstName: 'Hafsah', role: 'ADMIN' }
    ;(boardApi.get as any).mockResolvedValue({ ...board(NUDGE), myParticipantId: null })
    ;(groundsApi.get as any).mockResolvedValue({ initiatorId: 'u1', participants: [] })
    renderBoard()
    await screen.findByRole('heading', { name: 'Help my team understand' })
    expect(screen.queryByText(NUDGE)).toBeNull()
  })
})
