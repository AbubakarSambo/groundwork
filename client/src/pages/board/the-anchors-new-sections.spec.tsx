import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage } from './BoardPage'
import { boardApi } from '@/api/board'
import { groundsApi } from '@/api/grounds'
import { recommendedCheckInsApi } from '@/api/recommendedCheckIns'

/**
 * THE ANCHOR'S SECTIONS, NAMED BY THE SWITCHBOARD (decision 114; docs/answers-from-engine.md,
 * "8 October (later): the anchor through the ordinary routes, route by route").
 *
 * `whatYouAreCarrying`, `howGroundworkWillWork`, `weeklyInsight` and `ideasFromTheTeam` are each
 * carried on the board payload under their own name, gated on `b.sections.includes(...)` the same
 * way every other kind of work's sections already are - WHO READS WHAT IS DECIDED BY THE SERVER, so
 * there is no reader check in the screens at all: a lead-only section is simply absent from a
 * member's own payload, and the page draws nothing for a field it was not handed.
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

const sections = {
  whatYouAreCarrying: { heading: "What you're carrying", text: "I'm trying to get the team to see how renewals connect to delivery." },
  howGroundworkWillWork: {
    heading: "How I'll work with your team",
    ways: [{ key: 'understand', heading: 'Understand', sentence: 'Learn how each person currently sees their work and the wider outcome.' }],
  },
  weeklyInsight: { heading: 'This week', text: 'Your team is starting to move. Four people connected their work to the wider outcome this week.' },
  ideasFromTheTeam: {
    heading: 'Ideas from your team',
    ideas: [{ id: 'i1', title: 'A review one month before project close', raisedBy: 'Raised by Lucy.', similarNeedsSentence: null }],
    whenThereAreNone: 'Nobody has raised an idea yet.',
  },
}

const board = (opts?: { withSections?: (keyof typeof sections)[] }) => ({
  groundId: 'g1',
  renders: true,
  mode: 'SHARED',
  family: 'UPDATE',
  sections: opts?.withSections ?? [],
  title: 'Help my team understand',
  scenario: null,
  coverageVariant: 'NONE',
  myParticipantId: 'p1',
  canEditFrame: false,
  readOnlyNote: '',
  eachPerson: [],
  anchorScenarioOn: true,
  ...Object.fromEntries((opts?.withSections ?? []).map((k) => [k, sections[k]])),
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

describe('the anchor’s sections, for the lead', () => {
  it('draws whatYouAreCarrying, howGroundworkWillWork and weeklyInsight when the payload carries them', async () => {
    ;(boardApi.get as any).mockResolvedValue(board({ withSections: ['whatYouAreCarrying', 'howGroundworkWillWork', 'weeklyInsight'] }))
    ;(groundsApi.get as any).mockResolvedValue({ initiatorId: 'u1', participants: [] })
    renderBoard()
    expect(await screen.findByText("I'm trying to get the team to see how renewals connect to delivery.")).toBeTruthy()
    expect(screen.getByText('Learn how each person currently sees their work and the wider outcome.')).toBeTruthy()
    expect(screen.getByText('Your team is starting to move. Four people connected their work to the wider outcome this week.')).toBeTruthy()
  })

  it('draws ideasFromTheTeam through the same component as the older ideasFromYourTeam', async () => {
    ;(boardApi.get as any).mockResolvedValue(board({ withSections: ['ideasFromTheTeam'] }))
    ;(groundsApi.get as any).mockResolvedValue({ initiatorId: 'u1', participants: [] })
    renderBoard()
    expect(await screen.findByText('A review one month before project close')).toBeTruthy()
    expect(screen.getByText('Raised by Lucy.')).toBeTruthy()
  })

  it('draws nothing for any of them when the payload carries none', async () => {
    ;(boardApi.get as any).mockResolvedValue(board())
    ;(groundsApi.get as any).mockResolvedValue({ initiatorId: 'u1', participants: [] })
    renderBoard()
    await screen.findByRole('heading', { name: 'Help my team understand' })
    expect(screen.queryByText("I'm trying to get the team to see how renewals connect to delivery.")).toBeNull()
    expect(screen.queryByText('Your team is starting to move. Four people connected their work to the wider outcome this week.')).toBeNull()
  })
})

describe('the anchor’s sections, for a member, not the lead', () => {
  beforeEach(() => {
    currentUser = { id: 'u2', firstName: 'Kennedy', role: 'MEMBER' }
  })

  it('never draws the lead-only sections, because the server never serves them to a member', async () => {
    /* The realistic shape of a member's own payload - whatYouAreCarrying and weeklyInsight are the
       lead's alone (the-anchor-sections-on-the-board.ts), so a member's own answer never carries
       them; howGroundworkWillWork and ideasFromTheTeam are for everybody, so they do appear. */
    ;(boardApi.get as any).mockResolvedValue(board({ withSections: ['howGroundworkWillWork', 'ideasFromTheTeam'] }))
    ;(groundsApi.get as any).mockResolvedValue({ initiatorId: 'u1', participants: [] })
    renderBoard()
    expect(await screen.findByText('Learn how each person currently sees their work and the wider outcome.')).toBeTruthy()
    expect(screen.getByText('A review one month before project close')).toBeTruthy()
    expect(screen.queryByText("I'm trying to get the team to see how renewals connect to delivery.")).toBeNull()
    expect(screen.queryByText('Your team is starting to move. Four people connected their work to the wider outcome this week.')).toBeNull()
  })
})
