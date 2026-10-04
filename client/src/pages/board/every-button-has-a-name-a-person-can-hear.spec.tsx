import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage } from './BoardPage'
import { boardApi } from '@/api/board'
import { groundsApi } from '@/api/grounds'

/**
 * A SCREEN READER MUST NEVER ANNOUNCE A BOARD BUTTON AS JUST "BUTTON".
 *
 * The button-count test (e2e/the-prototype-count-of-buttons.spec.ts) counts buttons but never
 * reads whether each one has something to say for itself. Live captures of the government,
 * programme, support desk, asset loans, law firm matter and MarketView boards (scratchpad
 * `pictures/<kind>-A/lead-1440-api-..._board.json`, read live as the lead) carry the same shape
 * exercised here - a kind of work a lead can change, an objective a lead can change or add to, a
 * check-in record a lead can add, and a completed session a lead can open - and this renders that
 * shape from the shared `BoardPage` the same way, so a button that loses its name (an icon put in
 * without an `aria-label`, or a label prop left off) fails here before it reaches a real reader.
 *
 * Every button under test already carries a plain-words name read straight off what it does
 * ("Change the kind of work", "Open session 1", ...) - this only guards against one losing it
 * again, not a new rule about what the names should say.
 */
let me = { id: 'p-lead', firstName: 'Wanjiru', role: 'MEMBER' }
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: me }) }))
vi.mock('@/api/board', () => ({ boardApi: { get: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn() } }))
vi.mock('@/api/today', () => ({ todayApi: { get: vi.fn().mockResolvedValue({ count: 0, line: null, comingUp: [], needs: [] }) } }))
vi.mock('@/components/gw/ResolutionPanel', () => ({ ResolutionPanel: () => null }))
vi.mock('@/components/gw/WhatSuccessLooksLike', () => ({ WhatSuccessLooksLikeFor: () => null }))
vi.mock('@/components/gw/TheOtherBoardsYouAreIn', () => ({ TheOtherBoardsYouAreIn: () => null }))
vi.mock('@/components/gw/Suggestions', () => ({ SuggestionsForTheLead: () => null }))

const BOARD = {
  groundId: 'g1', renders: true, mode: 'SHARED', family: 'DELIVERY', title: 'Extension Access Programme, test', scenario: 'OKR_ALIGNMENT',
  coverageVariant: 'text', lastChangedAt: '2026-09-29T18:02:00.000Z',
  sections: ['checkInGrid', 'objectives'],
  myParticipantId: 'p-lead', canEditFrame: true, readOnlyNote: null,
  kindOfWork: 'a government programme' as const,
  objectives: [
    {
      id: 'o1', name: 'The plan is to have reached 6,000 farmers by now.', ownerParticipantId: null,
      target: 6000, count: 4100, isNew: false, askedOf: null, suggestedCount: null, suggestedSaid: null,
    },
  ],
  participants: [
    { id: 'p-lead', name: 'Wanjiru Lead', role: null, managingOnly: true, signedOffAt: null },
    { id: 'p-aisha', name: 'Aisha Wanjiku', role: null, managingOnly: false, signedOffAt: null },
  ],
  checkInGrid: {
    sessions: [1],
    rows: [
      { participantId: 'p-lead', name: 'Wanjiru Lead', role: null, managingOnly: true, cells: { '1': 'done' } },
      { participantId: 'p-aisha', name: 'Aisha Wanjiku', role: null, managingOnly: false, cells: { '1': 'done' } },
    ],
  },
}

const GROUND = {
  initiatorId: 'p-lead', leadFirstName: 'Wanjiru', timelineDays: 90, cadence: 'WEEKLY',
  participants: [
    { id: 'p-lead', managingOnly: true },
    { id: 'p-aisha', managingOnly: false },
  ],
  checkIns: [
    { sessionNumber: 1, status: 'COMPLETED', participantId: 'p-lead', isSetup: false },
    { sessionNumber: 1, status: 'COMPLETED', participantId: 'p-aisha', isSetup: false },
  ],
  roundCompletions: [{ sessionNumber: 1 }],
}

function renderBoard() {
  (boardApi.get as any).mockResolvedValue(BOARD);
  (groundsApi.get as any).mockResolvedValue(GROUND)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds/g1/board']}>
        <Routes><Route path="/grounds/:id/board" element={<BoardPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

/** A button's accessible name the plain way: its own `aria-label`, or its visible words. */
function accessibleName(button: HTMLElement): string {
  return button.getAttribute('aria-label')?.trim() || (button.textContent ?? '').trim()
}

describe('every button on the board has a name a screen reader can say', () => {
  it('names every button, as the lead, on a board with a kind of work, an objective, and a completed session', async () => {
    renderBoard()
    await screen.findByRole('heading', { name: 'Extension Access Programme, test' })
    // "The whole check-in" fold, where this kind of layout keeps the editing controls - opened the
    // same way a reader would, so nothing stays out of reach of this check.
    const fold = document.querySelector('details.gwui-folded') as HTMLDetailsElement | null
    if (fold && !fold.open) fold.setAttribute('open', '')

    const buttons = Array.from(document.querySelectorAll('button')) as HTMLButtonElement[]
    expect(buttons.length).toBeGreaterThan(0)
    const unnamed = buttons.filter((b) => !accessibleName(b))
    expect(unnamed.map((b) => b.outerHTML)).toEqual([])
  })
})
