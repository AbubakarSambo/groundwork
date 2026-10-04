import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage } from './BoardPage'
import { boardApi } from '@/api/board'
import { recommendedCheckInsApi } from '@/api/recommendedCheckIns'
import { groundsApi } from '@/api/grounds'

/**
 * "GROUNDWORK RECOMMENDS" (anchor piece 25; docs/anchor-scenario-plan.md section 5, row 9).
 *
 * On the check-in started from the anchor link, once something in the work shows it, Groundwork
 * offers the lead one more check-in - never a label on anybody, only what the record shows and a
 * question. The lead alone reads it, and only while `anchorScenarioOn` is served as true; the
 * server itself answers an empty list with the switch off or for anybody who is not the lead, but
 * this checks the screen never even asks when it already knows the answer must be nothing.
 */
vi.mock('@/api/board', () => ({ boardApi: { get: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn() } }))
vi.mock('@/api/recommendedCheckIns', () => ({
  recommendedCheckInsApi: { list: vi.fn(), yes: vi.fn(), notNow: vi.fn(), draftFromSetUp: vi.fn() },
}))

const navigated = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => navigated }
})

/* `currentUser` is read by the mocked store's selector at CALL time, not at mock-registration
   time, so each test can switch between the lead and a participant just by setting this before
   rendering - no need for `vi.doMock` to fight the module graph's static imports. */
let currentUser: { id: string; firstName: string; role: string } = { id: 'u1', firstName: 'Hafsah', role: 'ADMIN' }
vi.mock('@/stores/auth', () => ({
  useAuthStore: (sel: any) => sel({ user: currentUser }),
}))

const board = (anchorScenarioOn: boolean) => ({
  groundId: 'g1',
  renders: true,
  mode: 'SHARED',
  family: 'UPDATE',
  sections: [],
  title: 'Harvestline sales and delivery',
  scenario: null,
  coverageVariant: 'NONE',
  myParticipantId: 'p1',
  canEditFrame: false,
  readOnlyNote: '',
  anchorScenarioOn,
  participants: [
    { id: 'p1', name: 'Hafsah', role: null, managingOnly: false, signedOffAt: null },
    { id: 'p2', name: 'Kennedy', role: null, managingOnly: false, signedOffAt: null },
  ],
})

const anOffer = {
  id: 'rec1',
  kind: 'anchor_pair_check_in' as const,
  says: 'You and Kennedy seem to have different expectations about how work is handed over between you. Two handoffs between you are still waiting.',
  question: 'Would a separate check-in help you align on this?',
  yes: 'Yes, set it up',
  no: 'Not now',
}

function renderBoard(initialEntries: string[] = ['/grounds/g1/board']) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes><Route path="/grounds/:id/board" element={<BoardPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  currentUser = { id: 'u1', firstName: 'Hafsah', role: 'ADMIN' }
})

describe('for the lead, with the switch on', () => {

  it('draws an offer with its own words and both buttons', async () => {
    ;(boardApi.get as any).mockResolvedValue(board(true))
    ;(groundsApi.get as any).mockResolvedValue({ initiatorId: 'u1', participants: [] })
    ;(recommendedCheckInsApi.list as any).mockResolvedValue({ offers: [anOffer] })
    renderBoard()
    expect(await screen.findByText('Groundwork recommends')).toBeTruthy()
    expect(screen.getByText(anOffer.says)).toBeTruthy()
    expect(screen.getByText(anOffer.question)).toBeTruthy()
    expect(screen.getByText('Yes, set it up')).toBeTruthy()
    expect(screen.getByText('Not now')).toBeTruthy()
  })

  it('draws nothing when there are no offers', async () => {
    ;(boardApi.get as any).mockResolvedValue(board(true))
    ;(groundsApi.get as any).mockResolvedValue({ initiatorId: 'u1', participants: [] })
    ;(recommendedCheckInsApi.list as any).mockResolvedValue({ offers: [] })
    renderBoard()
    await waitFor(() => expect(recommendedCheckInsApi.list).toHaveBeenCalled())
    expect(screen.queryByText('Groundwork recommends')).toBeNull()
  })

  it('draws nothing, and never asks, with the switch off', async () => {
    ;(boardApi.get as any).mockResolvedValue(board(false))
    ;(groundsApi.get as any).mockResolvedValue({ initiatorId: 'u1', participants: [] })
    renderBoard()
    await screen.findAllByText('Harvestline sales and delivery')
    expect(screen.queryByText('Groundwork recommends')).toBeNull()
    expect(recommendedCheckInsApi.list).not.toHaveBeenCalled()
  })

  it('"Yes, set it up" calls the yes route, then draft-from-set-up, then opens /start prefilled with what it hands back', async () => {
    ;(boardApi.get as any).mockResolvedValue(board(true))
    ;(groundsApi.get as any).mockResolvedValue({ initiatorId: 'u1', participants: [] })
    ;(recommendedCheckInsApi.list as any).mockResolvedValue({ offers: [anOffer] })
    const setUp = { kind: 'anchor_pair_check_in', about: anOffer.says, aim: null, people: [{ name: 'Kennedy', email: 'kennedy@x.test' }] }
    ;(recommendedCheckInsApi.yes as any).mockResolvedValue({ state: 'ACCEPTED', setUp })
    const opened = {
      initial: anOffer.says, aim: 'The Nairobi launch',
      people: [{ email: 'kennedy@x.test', displayName: 'Kennedy' }],
      leftOut: [{ email: 'zed@elsewhere.com', why: 'Groundwork has no record of Zed in your organisation, so Zed is not added. You can add them yourself on the next step.' }],
    }
    ;(recommendedCheckInsApi.draftFromSetUp as any).mockResolvedValue(opened)
    renderBoard()
    const yesButton = await screen.findByText('Yes, set it up')
    fireEvent.click(yesButton)
    await waitFor(() => expect(recommendedCheckInsApi.yes).toHaveBeenCalledWith('g1', 'rec1'))
    await waitFor(() => expect(recommendedCheckInsApi.draftFromSetUp).toHaveBeenCalledWith(setUp))
    await waitFor(() => expect(navigated).toHaveBeenCalledWith('/start', { state: { anchorSetUp: opened } }))
  })

  it('"Not now" calls the not-now route and removes the offer', async () => {
    ;(boardApi.get as any).mockResolvedValue(board(true))
    ;(groundsApi.get as any).mockResolvedValue({ initiatorId: 'u1', participants: [] })
    ;(recommendedCheckInsApi.list as any).mockResolvedValueOnce({ offers: [anOffer] }).mockResolvedValue({ offers: [] })
    ;(recommendedCheckInsApi.notNow as any).mockResolvedValue({ state: 'DECLINED' })
    renderBoard()
    const noButton = await screen.findByText('Not now')
    fireEvent.click(noButton)
    await waitFor(() => expect(recommendedCheckInsApi.notNow).toHaveBeenCalledWith('g1', 'rec1'))
    await waitFor(() => expect(screen.queryByText('Groundwork recommends')).toBeNull())
    expect(navigated).not.toHaveBeenCalled()
  })
})

describe('for a participant, not the lead', () => {
  beforeEach(() => {
    currentUser = { id: 'u2', firstName: 'Kennedy', role: 'MEMBER' }
  })

  it('draws nothing, even with the switch on and an offer waiting', async () => {
    ;(boardApi.get as any).mockResolvedValue(board(true))
    ;(groundsApi.get as any).mockResolvedValue({ initiatorId: 'u1', participants: [] })
    renderBoard()
    await screen.findAllByText('Harvestline sales and delivery')
    expect(screen.queryByText('Groundwork recommends')).toBeNull()
    expect(recommendedCheckInsApi.list).not.toHaveBeenCalled()
  })
})
