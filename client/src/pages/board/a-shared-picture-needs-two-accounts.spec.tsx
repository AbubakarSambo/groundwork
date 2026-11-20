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

  /*
   * CHANGED 15 NOVEMBER (board explainers removed, Hafsah: "what the board does is still there; is it on
   * the list?"). These four used to pin the orange note "This board compares what people said, and there
   * is one person on this check-in. ... It will build once the person running this check-in adds
   * somebody." That note told the lead nothing and let them do nothing, so a board with one person now
   * shows what there is and explains nothing about why it is thin. They now pin that it is gone, for
   * the lead, for a party who cannot add anybody, and for a lead who only manages.
   */
  const noExplainer = () => {
    expect(document.body.textContent).not.toMatch(/compares what people said/i)
    expect(document.body.textContent).not.toMatch(/Add somebody and it will build/i)
    expect(document.body.textContent).not.toMatch(/once the person running this check-in adds somebody/i)
    expect(document.body.textContent).not.toMatch(/fills in once/i)
    expect(screen.queryByText('Where people differ')).toBeNull()
  }

  it('says nothing about the board being thin to a lead who can add somebody', async () => {
    ;(boardApi.get as any).mockResolvedValue(board(one, true))
    renderBoard()
    expect((await screen.findAllByText(/Kano sprint/)).length).toBeGreaterThan(0)
    noExplainer()
  })

  it('says nothing about it to a party who cannot add anybody', async () => {
    ;(boardApi.get as any).mockResolvedValue(board(one, false))
    renderBoard()
    expect((await screen.findAllByText(/Kano sprint/)).length).toBeGreaterThan(0)
    noExplainer()
  })

  it('and draws no empty comparison section once two people are on it with nothing to compare', async () => {
    ;(boardApi.get as any).mockResolvedValue(board(two, true))
    renderBoard()
    expect((await screen.findAllByText(/Kano sprint/)).length).toBeGreaterThan(0)
    noExplainer()
  })

  it('a managing-only lead is not the second person, and nothing explains it', async () => {
    ;(boardApi.get as any).mockResolvedValue(board([...one, { id: 'p9', name: 'Ada', role: null, managingOnly: true, signedOffAt: null }], true))
    renderBoard()
    expect((await screen.findAllByText(/Kano sprint/)).length).toBeGreaterThan(0)
    noExplainer()
  })
})

/**
 * SCREENS ITEM b (8 October): a lead who does not check in never reads "You have answered this session.", and the one-person
 * sentence does not say "accounts".
 */
describe('a lead who does not check in', () => {
  const withGlance = (participants: any[], myParticipantId: string) => ({
    ...board(participants, true),
    myParticipantId,
    howItIsGoing: { glance: { progress: { answeredThisRound: 1, ofPeople: 1 }, round: 1 } },
  })
  const leadWhoOnlyManages = { id: 'p-lead', name: 'Hafsah', role: null, managingOnly: true, signedOffAt: null }
  const kito = { id: 'p-kito', name: 'Kito', role: null, managingOnly: false, signedOffAt: null }

  it('does not read that she has answered, and the sentence does not say accounts', async () => {
    ;(boardApi.get as any).mockResolvedValue(withGlance([leadWhoOnlyManages, kito], 'p-lead'))
    ;(await import('@/api/grounds')).groundsApi.get = vi.fn().mockResolvedValue({ initiatorId: 'u1', participants: [] }) as any
    const { container } = renderBoard()
    expect((await screen.findAllByText(/Kano sprint/)).length).toBeGreaterThan(0)
    expect(container.textContent).toContain('The one person in this check-in has answered.')
    expect(container.textContent).not.toContain('You have answered this check-in.')
    /* Removed with the board explainers (15 November): a board with one person shows what there is and does not explain why it is thin. */
    expect(container.textContent).not.toContain('This board compares what people said')
    expect(container.textContent).not.toContain('It will build once')
    expect(container.textContent).not.toMatch(/compares accounts/)
  })
})
