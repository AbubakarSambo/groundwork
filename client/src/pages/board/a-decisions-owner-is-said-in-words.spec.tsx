import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage } from './BoardPage'
import { boardApi } from '@/api/board'

/**
 * SECOND BOARD REVIEW, WORDING: A DECISION'S OWNER IS SAID IN WORDS, NOT STAPLED ON AS A FRAGMENT.
 *
 * `d.owner`, on the lead's rows in "What needs you", used to print raw: a real name read fine, but
 * `board.service.ts`'s own stand-ins for "nobody is named" - "Lead and team", "Nobody has been
 * named to decide this.", or a dependency's own non-person label such as "the pipeline" - all read
 * as a fragment stuck on the end of the sentence, not words. Anything that is not a name on this
 * check-in's own roster now reads the prototype's own tag, "Decision needed"
 * (G1-example-check-ins: eng.txt, ops.txt); a real name reads "This comes from {person}.".
 */
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: { id: 'u-lead', firstName: 'Wairimu', role: 'MEMBER' } }) }))
vi.mock('@/api/board', () => ({ boardApi: { get: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn().mockResolvedValue({ initiatorId: 'u-lead' }) } }))
vi.mock('@/api/today', () => ({ todayApi: { get: vi.fn().mockResolvedValue({ count: 0, line: null, comingUp: [], needs: [] }) } }))
vi.mock('@/components/gw/HowThisHasMoved', () => ({ HowThisHasMoved: () => null }))
vi.mock('@/components/gw/ResolutionPanel', () => ({ ResolutionPanel: () => null }))
vi.mock('@/components/gw/WhatSuccessLooksLike', () => ({ WhatSuccessLooksLikeFor: () => null }))
vi.mock('@/components/gw/TheOtherBoardsYouAreIn', () => ({ TheOtherBoardsYouAreIn: () => null }))

const base = {
  groundId: 'g1', renders: true, mode: 'SHARED', family: 'DELIVERY', title: 'Sales team, Q3', scenario: 'NOT_A_REAL_SCENARIO',
  coverageVariant: 'text', lastChangedAt: '2026-09-23T15:02:00.000Z',
  sections: ['decisions'], myParticipantId: 'p-lead', canEditFrame: true, readOnlyNote: null,
  participants: [
    { id: 'p-lead', name: 'Wairimu Kamau', role: null, managingOnly: true, signedOffAt: null },
    { id: 'p-amani', name: 'Amani Wekesa', role: null, managingOnly: false, signedOffAt: null },
  ],
}

function renderBoard(decisions: any[]) {
  ;(boardApi.get as any).mockResolvedValue({ ...base, decisions })
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds/g1/board']}>
        <Routes><Route path="/grounds/:id/board" element={<BoardPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('a decision’s owner, on the lead’s rows in "What needs you"', () => {
  it('reads "Decision needed" for "Lead and team", never the raw fragment', async () => {
    renderBoard([{ question: 'Does a price range count as a budget?', why: 'It decides whether 4 deals count as qualified.', owner: 'Lead and team', source: 'divergence' }])
    expect(await screen.findByText('Does a price range count as a budget?')).toBeTruthy()
    expect(screen.getByText('Decision needed')).toBeTruthy()
    expect(screen.queryByText('Lead and team')).toBeNull()
  })

  /*
   * PROJECT BOARD REVIEW 1, FIX 8: A BLOCKER SAYS WHERE IT COMES FROM. These two cases are both
   * `source: 'blocker'`, which eng.txt and ops.txt read as "This comes from a blocker that keeps
   * coming back.", not "Decision needed" - updated because they were asserting the exact defect
   * the review found. "Decision needed" stays correct for a decision with no source to point to
   * at all (the "Lead and team" case, above, is `source: 'divergence'`).
   */
  it('reads "This comes from a blocker that keeps coming back." for "Nobody has been named to decide this."', async () => {
    renderBoard([{ question: 'Who owns the backup transporter decision?', why: 'Someone cannot move until this is decided.', owner: 'Nobody has been named to decide this.', source: 'blocker' }])
    await screen.findByText('Who owns the backup transporter decision?')
    expect(screen.getByText('This comes from a blocker that keeps coming back.')).toBeTruthy()
    expect(screen.queryByText('Nobody has been named to decide this.')).toBeNull()
    expect(screen.queryByText('Decision needed')).toBeNull()
  })

  it('reads "This comes from a blocker that keeps coming back." for a non-person label such as "the pipeline"', async () => {
    renderBoard([{ question: 'Somebody is waiting on a decision, so it needs deciding.', why: 'Someone cannot move until this is decided.', owner: 'the pipeline', source: 'blocker' }])
    await screen.findByText('Somebody is waiting on a decision, so it needs deciding.')
    expect(screen.getByText('This comes from a blocker that keeps coming back.')).toBeTruthy()
    expect(screen.queryByText('the pipeline', { selector: 'span' })).toBeNull()
    expect(screen.queryByText('Decision needed')).toBeNull()
  })

  it('reads "This comes from {person}." for a real name on the roster', async () => {
    renderBoard([{ question: 'Does a price range count as a budget?', why: 'It decides whether 4 deals count as qualified.', owner: 'Amani Wekesa', source: 'divergence' }])
    await screen.findByText('Does a price range count as a budget?')
    expect(screen.getByText('This comes from Amani Wekesa.')).toBeTruthy()
  })

  it('still reads "You" for the reader’s own name', async () => {
    renderBoard([{ question: 'Does a price range count as a budget?', why: 'It decides whether 4 deals count as qualified.', owner: 'Wairimu Kamau', source: 'divergence' }])
    await screen.findByText('Does a price range count as a budget?')
    expect(screen.getByText('You', { selector: 'span' })).toBeTruthy()
    expect(screen.queryByText('This comes from Wairimu Kamau.')).toBeNull()
  })
})
