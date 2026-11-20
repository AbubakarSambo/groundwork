import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage } from './BoardPage'
import { boardApi } from '@/api/board'

/**
 * REQUEST 107 (a): "ASKED FOR, NOT ANSWERED" READS AS ONE SENTENCE, NEVER "WHO — WHAT".
 *
 * The engine now sends `stillUnanswered` as `{ who, what, says, sinceRound, certain }`, with
 * `says` already worded as a full sentence for the reader in front of the board - "you" when the
 * gap is about the reader themself, their name otherwise. The screen used to draw this as
 * "<name> — <question>" plus a separate "open since session N" note: two pieces joined with a
 * dash, not a sentence. This proves the board now draws `says` on its own, and falls back to one
 * plain sentence (not a dash-joined pair) for an older payload that has no `says` yet.
 */
vi.mock('@/api/board', () => ({ boardApi: { get: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn().mockResolvedValue({ initiatorId: 'u-lead' }) } }))
vi.mock('@/api/today', () => ({ todayApi: { get: vi.fn().mockResolvedValue({ count: 0, line: null, comingUp: [], needs: [] }) } }))
vi.mock('@/components/gw/HowThisHasMoved', () => ({ HowThisHasMoved: () => null }))
vi.mock('@/components/gw/ResolutionPanel', () => ({ ResolutionPanel: () => null }))
vi.mock('@/components/gw/WhatSuccessLooksLike', () => ({ WhatSuccessLooksLikeFor: () => null }))
vi.mock('@/components/gw/TheOtherBoardsYouAreIn', () => ({ TheOtherBoardsYouAreIn: () => null }))

let me = { id: 'u-lead', firstName: 'Wairimu', role: 'MEMBER' }
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: me }) }))

function baseBoard(stillUnanswered: any[]) {
  return {
    groundId: 'g1', renders: true, mode: 'SHARED', family: 'DELIVERY', title: 'Sales team, Q3', scenario: 'OKR_ALIGNMENT',
    coverageVariant: 'text', lastChangedAt: '2026-09-23T15:02:00.000Z',
    sections: ['whoOwnsWhat'],
    myParticipantId: 'p-lead', canEditFrame: true, readOnlyNote: null,
    participants: [
      { id: 'p-lead', name: 'Wairimu Kamau', role: null, managingOnly: true, signedOffAt: null },
      { id: 'p-rukia', name: 'Rukia Mwangi', role: null, managingOnly: false, signedOffAt: null },
    ],
    whoOwnsWhat: [],
    stillUnanswered,
  }
}

function renderBoard(board: any) {
  ;(boardApi.get as any).mockResolvedValue(board)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds/g1/board']}>
        <Routes><Route path="/grounds/:id/board" element={<BoardPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('request 107 (a): "asked for, not answered" reads as one sentence', () => {
  it('draws the engine\'s own sentence, as the lead reading about Rukia, with no dash joining two pieces', async () => {
    me = { id: 'u-lead', firstName: 'Wairimu', role: 'MEMBER' }
    renderBoard(baseBoard([{
      who: 'Rukia Mwangi', what: 'How are you making your number?',
      says: 'In check-in 1, Rukia Mwangi was asked, "How are you making your number?" Rukia Mwangi has not answered it yet.',
      sinceRound: 1, certain: true,
    }]))
    await screen.findByRole('heading', { name: 'Sales team, Q3' })
    expect(screen.getByText('In check-in 1, Rukia Mwangi was asked, "How are you making your number?" Rukia Mwangi has not answered it yet.')).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('Rukia Mwangi — How are you making your number?')
    expect(document.body.textContent).not.toContain('open since check-in 1')
  })

  it('draws the engine\'s own sentence, as Rukia herself, in "you"', async () => {
    me = { id: 'u-rukia', firstName: 'Rukia', role: 'MEMBER' }
    renderBoard({
      ...baseBoard([{
        who: 'Rukia Mwangi', what: 'How are you making your number?',
        says: 'In check-in 1, you were asked, "How are you making your number?" You have not answered it yet.',
        sinceRound: 1, certain: true,
      }]),
      myParticipantId: 'p-rukia', canEditFrame: false,
    })
    await screen.findByRole('heading', { name: 'Sales team, Q3' })
    expect(screen.getByText('In check-in 1, you were asked, "How are you making your number?" You have not answered it yet.')).toBeInTheDocument()
  })

  it('falls back to one plain sentence, not "who — what", for an older payload with no `says`', async () => {
    me = { id: 'u-lead', firstName: 'Wairimu', role: 'MEMBER' }
    renderBoard(baseBoard([{
      who: 'Rukia Mwangi', what: 'How are you making your number?',
      sinceRound: 1, certain: true,
    } as any]))
    await screen.findByRole('heading', { name: 'Sales team, Q3' })
    expect(screen.getByText('In check-in 1, Rukia Mwangi was asked, "How are you making your number?" Rukia Mwangi has not answered it yet.')).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('Rukia Mwangi — How are you making your number?')
    expect(document.body.textContent).not.toContain('open since check-in 1')
  })
})
