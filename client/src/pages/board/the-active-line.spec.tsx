import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage } from './BoardPage'
import { boardApi } from '@/api/board'
import { groundsApi } from '@/api/grounds'
import { recommendedCheckInsApi } from '@/api/recommendedCheckIns'

/**
 * THE "ACTIVE" LINE (anchor piece 30/31; docs/anchor-scenario-plan.md section 5, row 12;
 * docs/answers-from-engine.md, "Request 147", `TheActiveLine`). Drawn in "The team today", for the
 * lead alone, exactly as the engine sends `line` - nothing when the board does not serve it.
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

const board = (activeLine?: { active: number; total: number; nudged: number; line: string }) => ({
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
  eachPerson: [{
    participantId: 'p2', who: 'Kennedy', nameIsTheirRole: false, target: null, count: 2,
    reason: 'nothing to do', says: 'Kennedy has checked in and nothing needs you yet.', ask: null,
  }],
  ...(activeLine ? { activeLine } : {}),
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

describe('the active line, for the lead', () => {
  it('draws nothing when the board does not serve it - exactly as before', async () => {
    ;(boardApi.get as any).mockResolvedValue(board())
    ;(groundsApi.get as any).mockResolvedValue({ initiatorId: 'u1', participants: [] })
    renderBoard()
    await screen.findByText('The team today')
    expect(screen.queryByText(/active/)).toBeNull()
  })

  it('draws the engine’s own line exactly as sent, when served', async () => {
    ;(boardApi.get as any).mockResolvedValue(board({ active: 18, total: 20, nudged: 2, line: '18/20 active · Groundwork has nudged the remaining 2.' }))
    ;(groundsApi.get as any).mockResolvedValue({ initiatorId: 'u1', participants: [] })
    renderBoard()
    expect(await screen.findByText('18/20 active · Groundwork has nudged the remaining 2.')).toBeTruthy()
  })
})

describe('the active line, for a participant, not the lead', () => {
  beforeEach(() => {
    currentUser = { id: 'u2', firstName: 'Kennedy', role: 'MEMBER' }
  })

  it('draws nothing, even when the board serves it', async () => {
    ;(boardApi.get as any).mockResolvedValue(board({ active: 18, total: 20, nudged: 2, line: '18/20 active · Groundwork has nudged the remaining 2.' }))
    ;(groundsApi.get as any).mockResolvedValue({ initiatorId: 'u1', participants: [] })
    renderBoard()
    await screen.findByText('The team today')
    expect(screen.queryByText('18/20 active · Groundwork has nudged the remaining 2.')).toBeNull()
  })
})
