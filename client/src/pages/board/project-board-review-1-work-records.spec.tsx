import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage } from './BoardPage'
import { boardApi } from '@/api/board'

/**
 * PROJECT BOARD REVIEW 1, FIX 3.
 *
 * Fixture shape copied from the review's own capture: the DRIFT board ("The partnerships work has
 * gone quiet", dac969d3) sends all six `workRecords` sections as "not-known", with the same `why`.
 */
let me = { id: 'p-lead', firstName: 'Zuri', role: 'MEMBER' }
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: me }) }))
vi.mock('@/api/board', () => ({ boardApi: { get: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn().mockResolvedValue({ initiatorId: 'p-lead', leadFirstName: 'Wanjiru' }) } }))
vi.mock('@/api/today', () => ({ todayApi: { get: vi.fn().mockResolvedValue({ count: 0, line: null, comingUp: [], needs: [] }) } }))
vi.mock('@/components/gw/HowThisHasMoved', () => ({ HowThisHasMoved: () => null }))
vi.mock('@/components/gw/ResolutionPanel', () => ({ ResolutionPanel: () => null }))
vi.mock('@/components/gw/WhatSuccessLooksLike', () => ({ WhatSuccessLooksLikeFor: () => null }))
vi.mock('@/components/gw/TheOtherBoardsYouAreIn', () => ({ TheOtherBoardsYouAreIn: () => null }))
vi.mock('@/components/gw/Suggestions', () => ({ SuggestionsForTheLead: () => null }))

const NOT_KNOWN_WHY = 'Groundwork does not know what kind of work this check-in is about yet, so it keeps no records of this kind.'

const DRIFT_BOARD = {
  groundId: 'g1', renders: true, mode: 'SHARED', family: 'SENSING', title: 'The partnerships work has gone quiet', scenario: 'DRIFT',
  coverageVariant: 'text', lastChangedAt: '2026-09-23T15:02:00.000Z',
  sections: [],
  myParticipantId: 'p-lead', canEditFrame: true, readOnlyNote: null,
  kindOfWork: null,
  participants: [{ id: 'p-lead', name: 'Zuri Hassan', role: null, managingOnly: true, signedOffAt: null }],
  headline: null,
  workRecords: [
    { section: 'Deal grid', holds: '', state: 'not-known' as const, why: NOT_KNOWN_WHY },
    { section: 'Forecast', holds: '', state: 'not-known' as const, why: NOT_KNOWN_WHY },
    { section: 'Themes', holds: '', state: 'not-known' as const, why: NOT_KNOWN_WHY },
    { section: 'Work plan', holds: '', state: 'not-known' as const, why: NOT_KNOWN_WHY },
    { section: 'Timeline', holds: '', state: 'not-known' as const, why: NOT_KNOWN_WHY },
    { section: 'Obligations', holds: '', state: 'not-known' as const, why: NOT_KNOWN_WHY },
  ],
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

describe('fix 3: every workRecords section not-known, same why', () => {
  it('says it once, with no "Deal grid" / "Forecast" / "Themes" / "Work plan" heading', async () => {
    me = { id: 'p-lead', firstName: 'Zuri', role: 'MEMBER' }
    renderBoard(DRIFT_BOARD)
    await screen.findByRole('heading', { name: 'The partnerships work has gone quiet' })
    expect(screen.getAllByText(NOT_KNOWN_WHY).length).toBe(1)
    expect(screen.queryByText('Deal grid')).toBeNull()
    expect(screen.queryByText('Forecast')).toBeNull()
    expect(screen.queryByText('Themes')).toBeNull()
    expect(screen.queryByText('Work plan')).toBeNull()
  })
})

const ENG_PARTICIPANT_BOARD = {
  groundId: 'g2', renders: true, mode: 'SHARED', family: 'DELIVERY', title: 'Engineering release, test', scenario: 'NEW_PROJECT',
  coverageVariant: 'text', lastChangedAt: '2026-09-29T18:02:00.000Z',
  sections: [],
  myParticipantId: 'p-aisha', canEditFrame: false, readOnlyNote: null,
  kindOfWork: 'engineering release' as const,
  participants: [
    { id: 'p-lead', name: 'Wanjiru Lead', role: null, managingOnly: true, signedOffAt: null },
    { id: 'p-aisha', name: 'Aisha Wanjiku', role: null, managingOnly: false, signedOffAt: null },
  ],
  headline: null,
  workRecords: [
    { section: 'Deal grid', holds: 'releases and tasks', state: 'none-yet' as const, stages: ['Worked on', 'Written', 'Merged', 'Tested', 'Deployed', 'Used'], rows: [], onlyYours: 'Only yours.' },
  ],
}

/**
 * PROJECT BOARD REVIEW 1, FIX 9.
 *
 * Fixture shape copied from the review's own capture: the engineering release's participant
 * (Aisha, 555ac67d) gets her own "Deal grid" back as `state: 'none-yet'` with
 * `onlyYours: 'Only yours.'`.
 */
describe('fix 9: "or", and the engine\'s own "Only yours" note', () => {
  /*
   * OPS BOARD REVIEW, ITEM 5: WHEN THE SECTION IS ALREADY NARROWED TO THIS READER'S OWN ROWS
   * (`onlyYours` sent), "No releases or tasks have come up yet." is not true of the check-in as a
   * whole - the lead may well have added one for somebody else. The body sentence now says so
   * ("None of the releases or tasks so far is yours."), beside the same "Only yours." note.
   */
  /* Changed 21 November 2026 (Batch E, N13): the sentence stays; the "Only yours." note beside the heading is gone (a privacy note the standards forbid). */
  it('reads "None of the releases or tasks so far is yours.", with no "Only yours." note', async () => {
    me = { id: 'p-aisha', firstName: 'Aisha', role: 'MEMBER' }
    renderBoard(ENG_PARTICIPANT_BOARD)
    await screen.findByRole('heading', { name: 'Engineering release, test' })
    expect(screen.getByText(/None of the releases or tasks so far is yours\./)).toBeTruthy()
    expect(screen.queryByText(/None of the releases and tasks so far is yours\./)).toBeNull()
    expect(screen.queryByText('Only yours.')).toBeNull()
  })
})
