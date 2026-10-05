import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage } from './BoardPage'
import { boardApi } from '@/api/board'
import { groundsApi } from '@/api/grounds'
import { recommendedCheckInsApi } from '@/api/recommendedCheckIns'
import type { TheIdeasFromYourTeam } from '@/api/anchorShapes'

/**
 * PIECE 19/20: "IDEAS FROM YOUR TEAM" (plan section 5, row 7; docs/answers-from-engine.md,
 * "Request 149, missing (1)", `TheIdeasFromYourTeam`). Served to everyone in the check-in, not the
 * lead alone - unlike the month board (the-month-board.spec.tsx), which draws nothing for a
 * participant. This proves the opposite: the same fixture draws for the lead and for a colleague.
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

const ideasFixture: TheIdeasFromYourTeam = {
  heading: 'Ideas from your team',
  ideas: [
    { id: 'idea-1', title: 'Client review one month before project close', raisedBy: 'Raised by Lucy.', similarNeedsSentence: 'Similar needs have appeared across three check-ins.' },
  ],
  whenThereAreNone: 'No idea from your team has been captured yet.',
}

const board = (opts?: { ideasFromYourTeam?: TheIdeasFromYourTeam }) => ({
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
  anchorScenarioOn: true,
  ...(opts?.ideasFromYourTeam ? { ideasFromYourTeam: opts.ideasFromYourTeam } : {}),
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
  currentUser = { id: 'u1', firstName: 'Hafsah', role: 'ADMIN' }
})

describe('"Ideas from your team", for the lead', () => {
  it('draws nothing when the field is not served', async () => {
    ;(boardApi.get as any).mockResolvedValue(board())
    ;(groundsApi.get as any).mockResolvedValue({ initiatorId: 'u1', participants: [] })
    renderBoard()
    await screen.findByRole('heading', { name: 'Help my team understand' })
    expect(screen.queryByText('Ideas from your team')).toBeNull()
  })

  it("draws the engine's own ideas, each raised by name", async () => {
    ;(boardApi.get as any).mockResolvedValue(board({ ideasFromYourTeam: ideasFixture }))
    ;(groundsApi.get as any).mockResolvedValue({ initiatorId: 'u1', participants: [] })
    renderBoard()
    expect(await screen.findByText('Ideas from your team')).toBeTruthy()
    expect(screen.getByText('Client review one month before project close')).toBeTruthy()
    expect(screen.getByText('Raised by Lucy.')).toBeTruthy()
  })
})

describe('"Ideas from your team", for a participant, not the lead', () => {
  beforeEach(() => {
    currentUser = { id: 'u2', firstName: 'Kennedy', role: 'MEMBER' }
  })

  it('draws the same ideas - this is not a lead-only part', async () => {
    ;(boardApi.get as any).mockResolvedValue(board({ ideasFromYourTeam: ideasFixture }))
    ;(groundsApi.get as any).mockResolvedValue({ initiatorId: 'u1', participants: [] })
    renderBoard()
    expect(await screen.findByText('Ideas from your team')).toBeTruthy()
    expect(screen.getByText('Client review one month before project close')).toBeTruthy()
  })
})
