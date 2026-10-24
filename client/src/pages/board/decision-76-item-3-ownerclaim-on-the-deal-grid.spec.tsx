import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage } from './BoardPage'
import { boardApi } from '@/api/board'

/**
 * DECISION 76, ITEM 3: A RECORD WITH NOBODY'S NAME ON IT BECOMES SOMEBODY'S ONLY ONCE THE LEAD
 * SAYS YES.
 *
 * Read live on "Sales team, Q3" after the engine's `journey/bring-a-check-in-up-to-date.ts`:
 * Rukia said, "I have signed Tuskys Westgate already, on 18 September.", but the Tuskys Westgate
 * deal still has nobody's name on it - the record never put her words to her as a claim, because
 * they were read before the claim existed. The engine now sends `ownerClaim` on the row, to the
 * lead alone, next to "Nobody is named for it yet.": "You said the Tuskys Westgate deal is yours.
 * Is it?" Her yes or no goes to `POST /grounds/:id/board/work-items/:itemId/claim` with `{ yes }`.
 */
let me = { id: 'u-rukia', firstName: 'Rukia', role: 'MEMBER' }
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: me }) }))
vi.mock('@/api/board', () => ({
  boardApi: { get: vi.fn(), addWorkItem: vi.fn(), updateWorkItem: vi.fn(), deleteWorkItem: vi.fn(), claimWorkItem: vi.fn() },
  KIND_OF_WORK_OPTIONS: [
    'sales org', 'engineering release', 'support desk', 'distribution operations',
    'trader training programme', "founder's own check-in", 'asset loans',
    'MarketView where next', 'MarketView Q4', 'a law firm matter', 'a government programme',
  ],
}))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn().mockResolvedValue({ initiatorId: 'u-rukia', organizationId: 'org-1', leadFirstName: 'Rukia' }), setKindOfWork: vi.fn() } }))
vi.mock('@/api/today', () => ({ todayApi: { get: vi.fn().mockResolvedValue({ count: 0, line: null, comingUp: [], needs: [] }) } }))
vi.mock('@/components/gw/HowThisHasMoved', () => ({ HowThisHasMoved: () => null }))
vi.mock('@/components/gw/ResolutionPanel', () => ({ ResolutionPanel: () => null }))
vi.mock('@/components/gw/WhatSuccessLooksLike', () => ({ WhatSuccessLooksLikeFor: () => null }))
vi.mock('@/components/gw/TheOtherBoardsYouAreIn', () => ({ TheOtherBoardsYouAreIn: () => null }))

const PARTICIPANTS = [
  { id: 'p-rukia', name: 'Rukia Otieno', role: null, managingOnly: false, signedOffAt: null },
  { id: 'p-amani', name: 'Amani Wekesa', role: null, managingOnly: false, signedOffAt: null },
]

const dealGridBoard = (overrides: any = {}) => ({
  groundId: 'g1', renders: true, mode: 'SHARED', family: 'DELIVERY', sections: [],
  title: 'Sales team, Q3', scenario: 'OKR_ALIGNMENT', coverageVariant: 'text',
  lastChangedAt: '2026-09-23T15:02:00.000Z',
  participants: PARTICIPANTS,
  myParticipantId: 'p-rukia', canEditFrame: true, readOnlyNote: null,
  kindOfWork: 'sales org',
  workRecords: [
    {
      section: 'Deal grid', holds: 'deals', state: 'filled',
      stages: ['Contacted', 'Need established', 'Pitched', 'Qualified', 'Quoted', 'Won'],
      rows: [
        {
          id: 'w-tuskys', kind: 'deal', name: 'Tuskys Westgate', stage: 'Won',
          owner: null, ownerParticipantId: null, due: null,
          fields: {}, from: 'said', mark: 'said',
          said: 'I have signed Tuskys Westgate already, on 18 September.',
          ownerClaim: { participantId: 'p-rukia', who: 'Rukia Otieno', says: 'You said the Tuskys Westgate deal is yours. Is it?' },
        },
      ],
    },
  ],
  ...overrides,
})

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

describe('ownerClaim on the deal grid row, for the lead only', () => {
  beforeEach(() => vi.clearAllMocks())

  it('draws the claim, with yes and no, next to "Nobody is named for it yet."', async () => {
    me = { id: 'u-rukia', firstName: 'Rukia', role: 'MEMBER' }
    renderBoard(dealGridBoard())
    const dealGrid = await screen.findByRole('region', { name: 'Every deal, day by day' })
    expect(within(dealGrid).getByText('Nobody is named for it yet.')).toBeTruthy()
    expect(within(dealGrid).getByText('You said the Tuskys Westgate deal is yours. Is it?')).toBeTruthy()
    expect(within(dealGrid).getByRole('button', { name: 'Yes' })).toBeTruthy()
    expect(within(dealGrid).getByRole('button', { name: 'No' })).toBeTruthy()
  })

  it('never draws a second navy button - yes and no are secondary, same as "Change"', async () => {
    me = { id: 'u-rukia', firstName: 'Rukia', role: 'MEMBER' }
    renderBoard(dealGridBoard())
    const dealGrid = await screen.findByRole('region', { name: 'Every deal, day by day' })
    const yes = within(dealGrid).getByRole('button', { name: 'Yes' })
    const no = within(dealGrid).getByRole('button', { name: 'No' })
    expect(yes.className).not.toMatch(/pri/)
    expect(no.className).not.toMatch(/pri/)
    expect(yes.className).toMatch(/sec/)
  })

  it('yes calls claimWorkItem with { yes: true }, on this check-in\'s own path, and shows saidBack', async () => {
    me = { id: 'u-rukia', firstName: 'Rukia', role: 'MEMBER' }
    ;(boardApi.claimWorkItem as any).mockResolvedValue({ record: { id: 'w-tuskys', ownerParticipantId: 'p-rukia' }, saidBack: "The Tuskys Westgate deal is now Rukia Otieno's." })
    renderBoard(dealGridBoard())
    const dealGrid = await screen.findByRole('region', { name: 'Every deal, day by day' })
    fireEvent.click(within(dealGrid).getByRole('button', { name: 'Yes' }))
    await waitFor(() => expect(boardApi.claimWorkItem).toHaveBeenCalledWith('g1', 'w-tuskys', true))
  })

  it('no calls claimWorkItem with { yes: false }', async () => {
    me = { id: 'u-rukia', firstName: 'Rukia', role: 'MEMBER' }
    ;(boardApi.claimWorkItem as any).mockResolvedValue({ record: { id: 'w-tuskys', ownerParticipantId: null }, saidBack: 'The Tuskys Westgate deal still has nobody’s name on it.' })
    renderBoard(dealGridBoard())
    const dealGrid = await screen.findByRole('region', { name: 'Every deal, day by day' })
    fireEvent.click(within(dealGrid).getByRole('button', { name: 'No' }))
    await waitFor(() => expect(boardApi.claimWorkItem).toHaveBeenCalledWith('g1', 'w-tuskys', false))
  })

  it('draws nothing for a reader who is not the lead, even when the server sends a claim by mistake', async () => {
    me = { id: 'u-amani', firstName: 'Amani', role: 'MEMBER' }
    renderBoard(dealGridBoard({ myParticipantId: 'p-amani', canEditFrame: false }))
    await screen.findByRole('heading', { name: 'Sales team, Q3' })
    expect(screen.queryByText('You said the Tuskys Westgate deal is yours. Is it?')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Yes' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'No' })).toBeNull()
  })

  it('draws nothing for a row with no ownerClaim at all', async () => {
    me = { id: 'u-rukia', firstName: 'Rukia', role: 'MEMBER' }
    const board = dealGridBoard()
    board.workRecords[0].rows[0].ownerClaim = null
    renderBoard(board)
    const dealGrid = await screen.findByRole('region', { name: 'Every deal, day by day' })
    expect(within(dealGrid).getByText('Nobody is named for it yet.')).toBeTruthy()
    expect(within(dealGrid).queryByRole('button', { name: 'Yes' })).toBeNull()
    expect(within(dealGrid).queryByRole('button', { name: 'No' })).toBeNull()
  })
})
