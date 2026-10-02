import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage } from './BoardPage'
import { boardApi } from '@/api/board'
import { groundsApi } from '@/api/grounds'

/**
 * RE-REVIEW, 2 OCTOBER: "RUKIA OTIENO" OVER RUKIA'S OWN ROW, ON HER OWN BOARD.
 *
 * Walked live on the sales board (9028f0ad-293b-4592-9a4e-25b680dd91cd) signed in as Rukia Otieno,
 * at 1440: "Who checked in", "Contribution against role" and "Where work is landing" each headed
 * her own row with her own name - "Rukia Otieno" - the same mistake "Who owns what" was fixed for
 * earlier (see re-review-30-september-second-pass.spec.tsx). Her own heading should read "You",
 * the same way, in all three places; everybody else's row keeps their real name.
 */
let currentUser = { id: 'u-rukia', firstName: 'Reader', role: 'MEMBER' }
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: currentUser }) }))
vi.mock('@/api/board', () => ({ boardApi: { get: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn() } }))
vi.mock('@/api/today', () => ({ todayApi: { get: vi.fn().mockResolvedValue({ count: 0, line: null, comingUp: [], needs: [] }) } }))
vi.mock('@/components/gw/HowThisHasMoved', () => ({ HowThisHasMoved: () => null }))
vi.mock('@/components/gw/ResolutionPanel', () => ({ ResolutionPanel: () => null }))
vi.mock('@/components/gw/WhatSuccessLooksLike', () => ({ WhatSuccessLooksLikeFor: () => null }))
vi.mock('@/components/gw/TheOtherBoardsYouAreIn', () => ({ TheOtherBoardsYouAreIn: () => null }))

const PARTICIPANTS = [
  { id: 'p-rukia', name: 'Rukia Otieno', role: null, managingOnly: false, signedOffAt: null },
  { id: 'p-amani', name: 'Amani Wekesa', role: null, managingOnly: false, signedOffAt: null },
]

/* Rukia both runs this check-in and is on its roster, the shape that put her own row inside
   "Contribution against role" and "Where work is landing" on the real sales board. */
const DEFAULT_GROUND = { initiatorId: 'u-rukia', timelineDays: 90, cadence: 'WEEKLY', leadFirstName: 'Rukia' }

function renderAs(user: { id: string }, board: any, ground: any = DEFAULT_GROUND) {
  currentUser = { ...user, firstName: 'Reader', role: 'MEMBER' }
  ;(boardApi.get as any).mockResolvedValue(board)
  ;(groundsApi.get as any).mockResolvedValue(ground)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds/g1/board']}>
        <Routes><Route path="/grounds/:id/board" element={<BoardPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('the reader\'s own row says "You", not their own name, at 1440', () => {
  it('heads the reader\'s own row with "You" in "Who checked in", keeping everyone else\'s name', async () => {
    const board = {
      groundId: 'g1', renders: true, mode: 'SHARED', family: 'DELIVERY', title: 'Sales team, Q3', scenario: 'OKR_ALIGNMENT',
      coverageVariant: 'text', lastChangedAt: '2026-09-23T15:02:00.000Z',
      sections: ['checkInGrid'], myParticipantId: 'p-rukia', canEditFrame: true, readOnlyNote: null,
      participants: PARTICIPANTS,
      checkInGrid: {
        sessions: [1, 2],
        rows: [
          { participantId: 'p-rukia', name: 'Rukia Otieno', cells: { '1': 'done', '2': 'done' } },
          { participantId: 'p-amani', name: 'Amani Wekesa', cells: { '1': 'done', '2': 'done' } },
        ],
      },
    }
    renderAs({ id: 'u-rukia' }, board)
    await screen.findByRole('heading', { name: 'Sales team, Q3' })
    await screen.findByText('Who checked in')
    expect(screen.getByText('You')).toBeTruthy()
    expect(screen.getByText('Amani Wekesa')).toBeTruthy()
    expect(screen.queryByText('Rukia Otieno')).toBeNull()
  })

  it('heads the reader\'s own card with "You" in "Contribution against role", keeping the colleague\'s name', async () => {
    const board = {
      groundId: 'g1', renders: true, mode: 'SHARED', family: 'DELIVERY', title: 'Sales team, Q3', scenario: 'OKR_ALIGNMENT',
      coverageVariant: 'text', lastChangedAt: '2026-09-23T15:02:00.000Z',
      sections: ['contribution'], myParticipantId: 'p-rukia', canEditFrame: true, readOnlyNote: null,
      participants: PARTICIPANTS,
      contribution: [
        { participantId: 'p-rukia', name: 'Rukia Otieno', remitDefined: true, reason: 'She has closed three of her four accounts this quarter.', shown: true, basis: null },
        { participantId: 'p-amani', name: 'Amani Wekesa', remitDefined: true, reason: 'He sells fridges in Kilimani.', shown: true, basis: null },
      ],
    }
    renderAs({ id: 'u-rukia' }, board)
    await screen.findByRole('heading', { name: 'Sales team, Q3' })
    expect(await screen.findByText('She has closed three of her four accounts this quarter.')).toBeTruthy()
    expect(screen.getByText('You', { selector: 'span' })).toBeTruthy()
    expect(screen.getByText('Amani Wekesa')).toBeTruthy()
    expect(screen.queryByText('Rukia Otieno')).toBeNull()
  })

  /*
   * Re-review, 2 October: the "No note" fallback under the reader's own card still said "This
   * person can add their own context..." under a heading that already says "You".
   */
  it('reads "No note. You can add your own context..." under the reader\'s own card in "Contribution against role", keeping the colleague\'s sentence in the third person', async () => {
    const board = {
      groundId: 'g1', renders: true, mode: 'SHARED', family: 'DELIVERY', title: 'Sales team, Q3', scenario: 'OKR_ALIGNMENT',
      coverageVariant: 'text', lastChangedAt: '2026-09-23T15:02:00.000Z',
      sections: ['contribution'], myParticipantId: 'p-rukia', canEditFrame: true, readOnlyNote: null,
      participants: PARTICIPANTS,
      contribution: [
        { participantId: 'p-rukia', name: 'Rukia Otieno', remitDefined: true, reason: 'She has closed three of her four accounts this quarter.', shown: true, basis: null, ownVoice: null },
        { participantId: 'p-amani', name: 'Amani Wekesa', remitDefined: true, reason: 'He sells fridges in Kilimani.', shown: true, basis: null, ownVoice: null },
      ],
    }
    renderAs({ id: 'u-rukia' }, board)
    await screen.findByRole('heading', { name: 'Sales team, Q3' })
    expect(await screen.findByText('No note. You can add your own context through your next check-in.')).toBeTruthy()
    expect(screen.getByText('No note. This person can add their own context through their next check-in.')).toBeTruthy()
  })

  it('heads the reader\'s own card with "You" in "Where work is landing", keeping the colleague\'s name', async () => {
    const board = {
      groundId: 'g1', renders: true, mode: 'SHARED', family: 'DELIVERY', title: 'Sales team, Q3', scenario: 'OKR_ALIGNMENT',
      coverageVariant: 'text', lastChangedAt: '2026-09-23T15:02:00.000Z',
      sections: ['coverage'], myParticipantId: 'p-rukia', canEditFrame: true, readOnlyNote: null,
      participants: PARTICIPANTS,
      coverage: {
        scope: 'team',
        reads: [
          {
            participantId: 'p-rukia', name: 'Rukia Otieno', scope: 'team', pct: 40, kind: 'STABLE', trend: 'flat',
            what: 'Rukia said she closed the Nyali Fresh account this week.',
            reason: '', reasonText: 'Nothing has shifted this week.', ownVoice: null, coupledToBlocker: false, remitDefined: true, shown: true,
          },
          {
            participantId: 'p-amani', name: 'Amani Wekesa', scope: 'team', pct: 60, kind: 'STABLE', trend: 'flat',
            what: 'Amani said he closed two accounts this week.',
            reason: '', reasonText: 'Nothing has shifted this week.', ownVoice: null, coupledToBlocker: false, remitDefined: true, shown: true,
          },
        ],
      },
    }
    renderAs({ id: 'u-rukia' }, board)
    await screen.findByRole('heading', { name: 'Sales team, Q3' })
    expect(await screen.findByText('Rukia said she closed the Nyali Fresh account this week.')).toBeTruthy()
    expect(screen.getByText('You', { selector: 'span' })).toBeTruthy()
    expect(screen.getByText('Amani Wekesa')).toBeTruthy()
    expect(screen.queryByText('Rukia Otieno')).toBeNull()
  })

  /*
   * Re-review, 2 October: "Staying with them" and the "No note" fallback, under a card already
   * headed "You", still talked about the reader's own row in the third person.
   */
  it('reads "Staying with you" and "No note. You can add context..." for the reader\'s own card in "Where work is landing", keeping the colleague\'s tag and sentence in the third person', async () => {
    const board = {
      groundId: 'g1', renders: true, mode: 'SHARED', family: 'DELIVERY', title: 'Sales team, Q3', scenario: 'OKR_ALIGNMENT',
      coverageVariant: 'text', lastChangedAt: '2026-09-23T15:02:00.000Z',
      sections: ['coverage'], myParticipantId: 'p-rukia', canEditFrame: true, readOnlyNote: null,
      participants: PARTICIPANTS,
      coverage: {
        scope: 'team',
        reads: [
          {
            participantId: 'p-rukia', name: 'Rukia Otieno', scope: 'team', pct: 40, kind: 'STABLE', trend: 'flat',
            what: 'Rukia said she closed the Nyali Fresh account this week.',
            reason: '', reasonText: 'Nothing has shifted this week.', ownVoice: null, coupledToBlocker: false, remitDefined: true, shown: true,
          },
          {
            participantId: 'p-amani', name: 'Amani Wekesa', scope: 'team', pct: 60, kind: 'STABLE', trend: 'flat',
            what: 'Amani said he closed two accounts this week.',
            reason: '', reasonText: 'Nothing has shifted this week.', ownVoice: null, coupledToBlocker: false, remitDefined: true, shown: true,
          },
        ],
      },
    }
    renderAs({ id: 'u-rukia' }, board)
    await screen.findByRole('heading', { name: 'Sales team, Q3' })
    expect(await screen.findByText('Staying with you')).toBeTruthy()
    expect(screen.getByText('Staying with them')).toBeTruthy()
    expect(screen.getByText('No note. You can add context through your next check-in.')).toBeTruthy()
    expect(screen.getByText('No note. This person can add context through their next check-in.')).toBeTruthy()
  })
})
