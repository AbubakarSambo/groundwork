import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage } from './BoardPage'
import { boardApi } from '@/api/board'

/**
 * PROJECT BOARD REVIEW 1, FIX 10: THE ENGINEERING GRID GETS "NOT RIGHT? TELL THE CHECK-IN", AND
 * "REPORTED AGAINST CRITERIA" (WHEN THE ENGINE SENDS IT) READS ENG.TXT'S OWN HEADING.
 *
 * Fixture shape copied from the review's own capture (555ac67d): a filled "Deal grid" for
 * kindOfWork "engineering release".
 */
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: { id: 'p-lead', firstName: 'Wanjiru', role: 'MEMBER' } }) }))
vi.mock('@/api/board', () => ({ boardApi: { get: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn().mockResolvedValue({ initiatorId: 'p-lead', leadFirstName: 'Wanjiru' }) } }))
vi.mock('@/api/today', () => ({ todayApi: { get: vi.fn().mockResolvedValue({ count: 0, line: null, comingUp: [], needs: [] }) } }))
vi.mock('@/components/gw/HowThisHasMoved', () => ({ HowThisHasMoved: () => null }))
vi.mock('@/components/gw/ResolutionPanel', () => ({ ResolutionPanel: () => null }))
vi.mock('@/components/gw/WhatSuccessLooksLike', () => ({ WhatSuccessLooksLikeFor: () => null }))
vi.mock('@/components/gw/TheOtherBoardsYouAreIn', () => ({ TheOtherBoardsYouAreIn: () => null }))
vi.mock('@/components/gw/Suggestions', () => ({ SuggestionsForTheLead: () => null }))

const BOARD = {
  groundId: 'g1', renders: true, mode: 'SHARED', family: 'DELIVERY', title: 'Engineering release, test', scenario: 'NEW_PROJECT',
  coverageVariant: 'text', lastChangedAt: '2026-09-29T18:02:00.000Z',
  sections: ['workRecords'],
  myParticipantId: 'p-lead', canEditFrame: true, readOnlyNote: null,
  kindOfWork: 'engineering release' as const,
  participants: [{ id: 'p-lead', name: 'Wanjiru Lead', role: null, managingOnly: true, signedOffAt: null }],
  workRecords: [
    {
      section: 'Deal grid', holds: 'releases and tasks', state: 'filled' as const,
      stages: ['Worked on', 'Written', 'Merged', 'Tested', 'Deployed', 'Used'],
      rows: [
        { id: 'r1', kind: 'release', name: 'Release 2.4', stage: 'Merged', owner: null, ownerParticipantId: null, due: null, lastSaidOn: null, fields: {}, from: 'lead', saidBy: null, saidByParticipantId: null, saidByLine: null, known: 'lead', knownSays: 'You added it on the board.', mark: 'none', next: null, nextKnown: null, nextSays: 'Nobody has said what happens next.' },
      ],
    },
  ],
  reportedAgainstCriteria: {
    state: 'not-known' as const,
    why: 'Nothing on record says what a release or task must show to be at each stage, so the board counts what people reported and how much of it has a document behind it, but not how many meet the rules.',
    stages: [],
  },
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

describe('fix 10: the engineering grid', () => {
  it('shows "Not right? Tell the check-in" under the grid, and eng.txt\'s own heading for "Reported against criteria"', async () => {
    renderBoard()
    await screen.findByRole('heading', { name: 'Engineering release, test' })
    expect(screen.getByRole('link', { name: 'Not right? Tell the check-in' })).toBeTruthy()
    expect(screen.getByText('Reported vs evidence, stage by stage')).toBeTruthy()
    expect(screen.queryByText('Reported, stage by stage')).toBeNull()
  })
})
