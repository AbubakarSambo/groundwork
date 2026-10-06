import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage } from './BoardPage'
import { boardApi } from '@/api/board'

/**
 * U.10 REVIEW ITEM 4: THE BOARD'S OWN WORDS, AS SENTENCES.
 *
 * A live board mixed three habits CLAUDE.md rules out: capitals headings ("AT A GLANCE"), pieces
 * joined with a middle dot ("Progress 0 of 12 rounds · 4 of 5 answered this round"), and a
 * colon-joined label ("Why: ..."). Rendering the board with as many sections switched on as one
 * fixture can carry, and scanning what a reader actually sees, catches a regression in any of them
 * without needing to know which section it landed in.
 *
 * WHAT THIS DOES NOT CATCH. Text that comes from the server (the engine's own sentences) is not
 * this screen's to fix - those are requests, not code changes - so this only exercises fixed
 * fixture strings the screen itself supplies or assembles, plus the screen's own chrome.
 */
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: { id: 'u-lead', firstName: 'Wairimu', role: 'MEMBER' } }) }))
vi.mock('@/api/board', () => ({ boardApi: { get: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn().mockResolvedValue({ initiatorId: 'u-lead' }) } }))
vi.mock('@/api/today', () => ({ todayApi: { get: vi.fn().mockResolvedValue({ count: 0, line: null, comingUp: [], needs: [] }) } }))
vi.mock('@/components/gw/HowThisHasMoved', () => ({ HowThisHasMoved: () => null }))
vi.mock('@/components/gw/ResolutionPanel', () => ({ ResolutionPanel: () => null }))
vi.mock('@/components/gw/WhatSuccessLooksLike', () => ({ WhatSuccessLooksLikeFor: () => null }))
vi.mock('@/components/gw/TheOtherBoardsYouAreIn', () => ({ TheOtherBoardsYouAreIn: () => null }))

const BOARD = {
  groundId: 'g1', renders: true, mode: 'SHARED', family: 'DELIVERY', title: 'Sales team, Q3', scenario: 'OKR_ALIGNMENT',
  coverageVariant: 'text', lastChangedAt: '2026-09-23T15:02:00.000Z',
  sections: ['objectives', 'divergence', 'whoOwnsWhat', 'dependencies', 'checkInGrid', 'contribution', 'coverage', 'decisions'],
  myParticipantId: 'p-lead', canEditFrame: true, readOnlyNote: null,
  participants: [
    { id: 'p-lead', name: 'Wairimu Kamau', role: null, managingOnly: true, signedOffAt: null },
    { id: 'p-rukia', name: 'Rukia Otieno', role: null, managingOnly: false, signedOffAt: null },
  ],
  objectives: [{
    id: 'o-team', name: 'Sales', count: 21, prevCount: 20, target: 25, delta: 1, isNew: false, askedOf: null,
    suggestedCount: null, notSettled: null,
  }],
  divergence: {
    items: [{
      topic: '12 shops', text: 'The two accounts do not agree on how many shops have signed.',
      positions: [
        { who: 'Rukia Otieno', view: 'Rukia Otieno’s opening brief said nine shops had signed.' },
        { who: 'Wairimu Kamau', view: 'Your opening brief said twelve.' },
      ],
      atStake: 'Whether the target needs revising this session.',
    }],
    agreements: ['The deadline is 20 December.'],
    centralQuestion: null, pointer: '',
  },
  whoOwnsWhat: [{
    participantId: 'p-rukia', name: 'Rukia Otieno', role: null,
    items: [{ id: 'i1', type: 'COMMITMENT', text: 'Will close the Nyali Fresh account.', sessionNumber: 1 }],
  }],
  dependencies: [{ id: 'd1', from: 'Rukia Otieno', what: 'a signed contract', on: 'Wairimu Kamau', status: 'WAITING', then: null }],
  checkInGrid: { sessions: [1], rows: [{ participantId: 'p-rukia', name: 'Rukia Otieno', role: null, managingOnly: false, cells: { 1: 'done' } }] },
  contribution: [{
    participantId: 'p-rukia', name: 'Rukia Otieno', remit: null, remitDefined: true,
    position: null, positionLabel: null, reason: 'She has closed three of her four accounts this quarter.',
    fnLabel: null, fnConfident: true, isBlocked: false, ownVoice: null, shown: true,
  }],
  coverage: {
    scope: 'team',
    reads: [{
      participantId: 'p-rukia', name: 'Rukia Otieno', scope: 'team', pct: 40, kind: 'STABLE', trend: 'flat',
      what: 'Rukia said she closed the Nyali Fresh account this week.',
      reason: '', reasonText: '', ownVoice: null, coupledToBlocker: false, remitDefined: true, shown: true,
    }],
  },
  decisions: [{ question: 'Should the target move to 30?', why: 'Two more shops signed than planned.', owner: 'Wairimu Kamau', source: 'divergence' }],
}

function renderBoard() {
  ;(boardApi.get as any).mockResolvedValue(BOARD)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds/g1/board']}>
        <Routes><Route path="/grounds/:id/board" element={<BoardPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('the board reads as sentences', () => {
  it('never joins pieces with a middle dot', async () => {
    renderBoard()
    await screen.findByRole('heading', { name: 'Sales team, Q3' })
    expect(document.body.textContent).not.toContain(' · ')
  })

  it('never opens a line with a capitalised word and a colon, "Label: "', async () => {
    renderBoard()
    await screen.findByRole('heading', { name: 'Sales team, Q3' })
    expect(document.body.textContent).not.toMatch(/\b[A-Z][a-z]+:\s/)
  })

  it('never renders three or more words in a row in capitals as the visible text', async () => {
    renderBoard()
    await screen.findByRole('heading', { name: 'Sales team, Q3' })
    // CSS text-transform is allowed to draw a heading in capitals; this checks the actual text
    // content, which is what a screen reader, a copy-paste, or this very test actually reads.
    expect(document.body.textContent).not.toMatch(/\b[A-Z]+(?:\s[A-Z]+){2,}\b/)
  })

  it('never glues a kind tag to the sentence before it', async () => {
    renderBoard()
    expect(await screen.findByText('12 shops')).toBeTruthy()
    expect(document.body.textContent).not.toMatch(/shops\.?agreed/i)
    expect(document.body.textContent).not.toMatch(/shops\.?differs/i)
  })

  it('stacks a name and what they said, rather than joining them with a dash', async () => {
    renderBoard()
    expect(await screen.findByText('Rukia Otieno’s opening brief said nine shops had signed.')).toBeTruthy()
    expect(document.body.textContent).not.toMatch(/Rukia Otieno - Rukia Otieno/)
  })

  /*
   * U.10 RE-REVIEW, THIRD ROUND: "MAKE YOUR GUARD SPEC READ COMPUTED STYLE ON THE RENDERED BOARD."
   *
   * The previous version of this check only asked three named elements whether THEY carried
   * `textTransform: uppercase` - so "Nothing above this", the quick-read tile labels and the
   * bottom legend ("What is open, first", "Each gap names both sides", "Honest closes") all kept
   * drawing in capitals, unnoticed, because nothing had asked them by name. Zone and Sec (kit.tsx)
   * no longer use `textTransform: uppercase` either (this round removed it there too, product-wide
   * - see the commit), so there is no longer any known-good exception to carve out: this walks
   * every element actually rendered on the board and fails if `getComputedStyle` reports
   * `uppercase` on ANY of them, wherever it came from.
   */
  it('nothing on the rendered board is drawn in capitals by textTransform, anywhere', async () => {
    renderBoard()
    await screen.findByRole('heading', { name: 'Sales team, Q3' })
    const offenders: string[] = []
    document.querySelectorAll('body *').forEach((el) => {
      const cs = window.getComputedStyle(el as Element)
      if (cs.textTransform === 'uppercase' && (el.textContent ?? '').trim()) {
        offenders.push(`${el.tagName.toLowerCase()}: ${(el.textContent ?? '').trim().slice(0, 60)}`)
      }
    })
    expect(offenders).toEqual([])
  })
})
