import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage } from './BoardPage'
import { boardApi } from '@/api/board'
import { PRIVATE_NOTE, whereTheNoteIs } from '@/test/the-leads-note-is-never-a-label'

/**
 * THE BOARD NEVER NAMES SOMEBODY WITH THE LEAD'S NOTE ABOUT THEM. Request 36, 27 September 2026.
 *
 * Three people on the check-in have no name. The server sends their name as null, and sends the
 * lead's note (`role`, `remit`) only to whoever runs the check-in (theLeadsWordsAbout). Read as the
 * lead, a participant and an admin who only reads: the names are the engine's plain words ("One
 * colleague", "Another colleague", "A third colleague"), never "A teammate"; and the note shows up
 * only for the lead, beside the name, as "Your note: ...".
 */
let me = { id: 'u-grace', firstName: 'Grace', role: 'MEMBER' }
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: me }) }))
vi.mock('@/api/board', () => ({ boardApi: { get: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn().mockResolvedValue({ initiatorId: 'u-grace' }) } }))
vi.mock('@/api/today', () => ({ todayApi: { get: vi.fn().mockResolvedValue({ count: 0, line: null, comingUp: [], needs: [] }) } }))
vi.mock('@/components/gw/HowThisHasMoved', () => ({ HowThisHasMoved: () => null }))
vi.mock('@/components/gw/ResolutionPanel', () => ({ ResolutionPanel: () => null }))
vi.mock('@/components/gw/WhatSuccessLooksLike', () => ({ WhatSuccessLooksLikeFor: () => null }))
vi.mock('@/components/gw/TheOtherBoardsYouAreIn', () => ({ TheOtherBoardsYouAreIn: () => null }))

const UNNAMED = ['p-a', 'p-b', 'p-c']

function boardFor(reader: 'lead' | 'participant' | 'admin') {
  const runs = reader !== 'participant'
  const note = runs ? PRIVATE_NOTE : null
  return {
    groundId: 'g1', renders: true, mode: 'SHARED', family: 'DELIVERY', title: 'Sales team, Q3', scenario: 'OKR_ALIGNMENT',
    coverageVariant: 'text', lastChangedAt: '2026-09-23T15:02:00.000Z',
    sections: ['whoOwnsWhat', ...(runs ? ['checkInGrid'] : []), 'contribution', 'coverage'],
    myParticipantId: reader === 'lead' ? 'p-lead' : reader === 'participant' ? 'p-a' : null,
    canEditFrame: reader === 'lead',
    readOnlyNote: reader === 'admin' ? 'You can read this check-in’s board and reports. Grace Obi runs it.' : null,
    participants: [
      { id: 'p-lead', name: 'Grace Obi', role: null, managingOnly: true, signedOffAt: null },
      ...UNNAMED.map((id) => ({ id, name: null, role: note, managingOnly: false, signedOffAt: null })),
    ],
    whoOwnsWhat: UNNAMED.map((id, i) => ({ participantId: id, name: null, role: note, items: [{ id: `i${i}`, type: 'OWNS', text: `Owns part ${i + 1} of the plan.`, sessionNumber: 1 }] })),
    checkInGrid: runs
      ? { sessions: [1], rows: UNNAMED.map((id) => ({ participantId: id, name: null, role: note, managingOnly: false, cells: { 1: 'COMPLETED' } })) }
      : undefined,
    contribution: UNNAMED.map((id) => ({
      participantId: id, name: null, remit: note, remitDefined: true, position: null, reason: null, shown: true,
    })),
    coverage: {
      scope: 'team',
      reads: UNNAMED.map((id) => ({
        participantId: id, name: null, scope: 'team', pct: 40, kind: 'STABLE', trend: 'flat', what: 'Covers the work it should.',
        reason: '', reasonText: '', ownVoice: null, coupledToBlocker: false, remitDefined: true, shown: true,
      })),
    },
  }
}

function renderBoard(payload: any) {
  ;(boardApi.get as any).mockResolvedValue(payload)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds/g1/board']}>
        <Routes><Route path="/grounds/:id/board" element={<BoardPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('the board never names somebody with the lead’s note', () => {
  beforeEach(() => vi.clearAllMocks())

  it('as the lead: the names are plain words, and the note is only their own labelled note', async () => {
    me = { id: 'u-grace', firstName: 'Grace', role: 'MEMBER' }
    renderBoard(boardFor('lead'))
    expect(await screen.findByText('Owns part 1 of the plan.')).toBeTruthy()
    for (const words of ['One colleague', 'Another colleague', 'A third colleague']) {
      expect(screen.getAllByText(words).length).toBeGreaterThan(0)
    }
    const { asTheirNote, elsewhere } = whereTheNoteIs()
    expect(elsewhere).toEqual([])
    expect(asTheirNote.length).toBeGreaterThan(0)
    for (const n of asTheirNote) expect(n).toBe('Your note on Daniel9k2PRIVATE-DESCRIPTION-9k2 is not meeting targets.') /* heading, then the note beneath it; textContent joins them */
    expect(document.body.textContent).not.toMatch(/teammate/i)
  })

  it('as a participant: the same plain words, and no part of the note anywhere', async () => {
    me = { id: 'u-a', firstName: '', role: 'MEMBER' }
    renderBoard(boardFor('participant'))
    expect(await screen.findByText('Owns part 1 of the plan.')).toBeTruthy()
    expect(screen.getAllByText('Another colleague').length).toBeGreaterThan(0)
    expect(whereTheNoteIs()).toEqual({ asTheirNote: [], elsewhere: [] })
    expect(document.body.textContent).not.toMatch(/teammate/i)
  })

  it('as an admin who reads it: plain words, and the note never as a name', async () => {
    me = { id: 'u-admin', firstName: 'Amina', role: 'ADMIN' }
    renderBoard(boardFor('admin'))
    expect(await screen.findByText('Owns part 1 of the plan.')).toBeTruthy()
    expect(screen.getAllByText('One colleague').length).toBeGreaterThan(0)
    expect(whereTheNoteIs().elsewhere).toEqual([])
    expect(document.body.textContent).not.toMatch(/teammate/i)
  })
})
