/* THE WHOLE BOARD, AS IT WAS (screen match, 16 October): this file's assertions as they stood before the board was drawn as pictured, now read on "See every other part of this board" (?whole=1), so nothing the picture leaves out is lost. */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage } from './BoardPage'
import { boardApi } from '@/api/board'
import { groundsApi } from '@/api/grounds'

/**
 * BOARD TASK, PHASE 2, PART B: THE PARTICIPANT'S OWN VIEW (B5's board-as-participant.txt).
 *
 * A participant's board now leads with a short personal view - whether today's team picture is
 * shared, a way to their own report, and their own records, "Only yours" - with everything the
 * board already gave them folded below it under one name, "The whole check-in", so nothing they
 * could read today is taken away. The lead's own board is unchanged by any of this.
 */
let me = { id: 'u-miriam', firstName: 'Miriam', role: 'MEMBER' }
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: me }) }))
vi.mock('@/api/board', () => ({ boardApi: { get: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn() } }))
vi.mock('@/api/today', () => ({ todayApi: { get: vi.fn().mockResolvedValue({ count: 0, line: null, comingUp: [], needs: [] }) } }))
vi.mock('@/components/gw/HowThisHasMoved', () => ({ HowThisHasMoved: () => null }))
vi.mock('@/components/gw/ResolutionPanel', () => ({ ResolutionPanel: () => null }))
vi.mock('@/components/gw/WhatSuccessLooksLike', () => ({ WhatSuccessLooksLikeFor: () => null }))
vi.mock('@/components/gw/TheOtherBoardsYouAreIn', () => ({ TheOtherBoardsYouAreIn: () => null }))
vi.mock('@/components/gw/Suggestions', () => ({ SuggestionsForTheLead: () => null }))

const PARTICIPANTS = [
  { id: 'p-wairimu', name: 'Wairimu Kamau', role: null, managingOnly: true, signedOffAt: null },
  { id: 'p-miriam', name: 'Miriam Wanjiku', role: null, managingOnly: false, signedOffAt: null },
  { id: 'p-aisha', name: 'Aisha Otieno', role: null, managingOnly: false, signedOffAt: null },
]

const workRecords = [
  {
    section: 'Deal grid', holds: 'deals', state: 'filled' as const, stages: ['Need', 'Quoted', 'Signed'],
    rows: [
      { id: 'd-miriam-1', kind: 'deal', name: 'Westgate Deli', stage: 'Quoted', owner: 'Miriam Wanjiku', ownerParticipantId: 'p-miriam', due: null, fields: {}, from: 'said' as const, said: 'Quoted them KES 95,000.', saidBy: 'Miriam' },
      { id: 'd-aisha-1', kind: 'deal', name: 'Greenhill Mart', stage: 'Signed', owner: 'Aisha Otieno', ownerParticipantId: 'p-aisha', due: null, fields: {}, from: 'said' as const, said: 'Signed last week.', saidBy: 'Aisha' },
    ],
  },
  /*
   * BOARD REVIEW, SALES PIECE D, ITEM 5: "Forecast" IS ABOUT THE WHOLE TEAM, NOT ONE PERSON'S OWN
   * RECORDS, SO A PARTICIPANT READS IT TOO - see the fixed gate in BoardPage.tsx.
   */
  {
    section: 'Forecast', holds: 'where the sales numbers are likely to end up', state: 'filled' as const,
    rows: [
      { id: 'f-1', kind: 'forecast', name: 'This quarter', stage: null, owner: null, ownerParticipantId: null, due: null, fields: { Likely: 'KES 9.4M' }, from: 'lead' as const },
    ],
  },
]

/*
 * BOARD FIX (sales B, item 3a): `teamPicture` IS THE ENGINE'S OWN ANSWER, NOT A ROUND COUNT. The
 * client used to derive "is it shared" from `roundCompletions` by way of `sessionRows`, a second
 * reading of the same fact the server's own `aParticipantsOwnBoard` already decides
 * (`reader.released`) and sends as `teamPicture`. The board now draws that field directly, so the
 * fixture sends it directly too, rather than the round-completions machinery this used to need to
 * get the client to compute the same answer a different way.
 */
const NOT_SHARED_YET = {
  shared: false as const,
  says: "Today's team picture is not shared yet.",
  yourOwnReport: 'Your own report is ready now.',
}

function board(overrides: any = {}) {
  return {
    groundId: 'g1', renders: true, mode: 'SHARED', family: 'DELIVERY', sections: [],
    title: 'Sales team, Q3', scenario: 'NOT_A_REAL_SCENARIO', coverageVariant: 'text',
    lastChangedAt: '2026-09-23T15:02:00.000Z',
    participants: PARTICIPANTS,
    myParticipantId: 'p-miriam', canEditFrame: false, readOnlyNote: null,
    kindOfWork: 'sales org',
    workRecords,
    teamPicture: NOT_SHARED_YET,
    howItIsGoing: { latestSummary: null, glance: { progress: { roundsDone: 0, roundsPlanned: 12, answeredThisRound: 2, ofPeople: 3 }, inTheWay: { count: 0, oldest: null, daysWaiting: null } } },
    ...overrides,
  }
}

/*
 * THE SAME CHECK-IN ROWS `buildSessionRows` READS (lib/session-rows.ts): a round only counts as
 * shared once `roundCompletions` actually has an entry for it, never from a round count alone.
 */
const GROUND_PARTICIPANTS = [
  { id: 'p-wairimu', userId: 'u-wairimu', managingOnly: true },
  { id: 'p-miriam', userId: 'u-miriam', managingOnly: false },
  { id: 'p-aisha', userId: 'u-aisha', managingOnly: false },
]

function renderBoard(payload: any, ground: any = {
  initiatorId: 'u-wairimu', leadFirstName: 'Wairimu', scenario: 'NOT_A_REAL_SCENARIO',
  participants: GROUND_PARTICIPANTS,
  checkIns: [
    { id: 'ci-wairimu-1', sessionNumber: 1, participantId: 'p-wairimu', status: 'COMPLETED', completedAt: '2026-09-23T10:00:00.000Z' },
    { id: 'ci-miriam-1', sessionNumber: 1, participantId: 'p-miriam', status: 'COMPLETED', completedAt: '2026-09-23T10:05:00.000Z' },
    // Aisha has not checked in yet, so session 1 has not closed.
  ],
  roundCompletions: [],
}) {
  ;(boardApi.get as any).mockResolvedValue(payload)
  ;(groundsApi.get as any).mockResolvedValue(ground)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds/g1/board?whole=1']}>
        <Routes><Route path="/grounds/:id/board" element={<BoardPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('the participant’s own view, first (board-as-participant.txt)', () => {
  it('Miriam reads whether today’s picture is shared, a way to her own report, and only her own deals', async () => {
    me = { id: 'u-miriam', firstName: 'Miriam', role: 'MEMBER' }
    renderBoard(board())
    await screen.findByRole('heading', { name: 'Sales team, Q3' })

    // Nothing has been shared yet (the round has not closed): says so, and names the lead.
    expect(screen.getByText('Today’s team picture isn’t shared yet.')).toBeTruthy()
    expect(screen.getByText('Wairimu shares it. Your own report is ready now.')).toBeTruthy()
    /*
     * RELEASE WALKTHROUGH A, FIX 1: "READ YOUR OWN REPORT" USED TO GO TO `/grounds/:id/report`
     * (`?tab=report`) - a fold of the whole check-in with no report of Miriam's own in it. It now
     * opens her own latest finished session's report directly, by the check-in id `sessionRows`
     * already carries (`myCheckInId`, lib/session-rows.ts) - the newest one for which it is set.
     */
    expect(screen.getByRole('link', { name: 'Read your own report' })).toHaveAttribute('href', '/checkin/ci-miriam-1/report')

    // Her own deal, marked "Only yours" - in her own personal section, above the fold, under the
    // prototype's own heading (board-as-participant.txt: "Your deals, day by day" - board fix,
    // sales B, item 3b, not "Your own deals, day by day").
    const ownSection = screen.getByText('Your deals, day by day').closest('section') as HTMLElement
    expect(within(ownSection).getByText('Only yours.')).toBeTruthy()
    expect(within(ownSection).getByText('Westgate Deli')).toBeTruthy()
    expect(within(ownSection).queryByText('Greenhill Mart')).toBeNull()

    // No "Your share" box: this fixture sends no `yourShare` field, so nothing is drawn.
    expect(screen.queryByText(/Your share/)).toBeNull()

    // Everything else this reader may read is still there, just folded under one name.
    expect(screen.getByText('The whole check-in')).toBeTruthy()
    /*
     * SECOND BOARD REVIEW, WORDING: "Everything from this check-in, as before." did not say who it
     * was from or for - it now names both ("Everything else from this check-in, for everyone in
     * it."), since this fold holds everybody's work, not only what came before.
     */
    expect(screen.getByText('Everything else from this check-in, for everyone in it.')).toBeTruthy()
    const whole = screen.getByText('The whole check-in').closest('details') as HTMLElement
    expect(whole).toBeTruthy()

    /*
     * BOARD REVIEW, SALES PIECE C, ITEM 4: NOT AISHA'S DEAL AGAIN, ANYWHERE ON THIS BOARD.
     *
     * This used to assert the opposite - that the whole deal grid, Aisha's row included, was still
     * there inside the fold. It was wrong to assert, not just wrong to draw: the fold held the
     * whole team's "Every deal, day by day" grid under its own heading, which for a sales ground
     * reads "No deals have come up yet" when a reader's own section (just above) already showed
     * deals - Miriam's own. `TheParticipantsOwnView`'s "Your deals, day by day" is her complete
     * record of her own work; the team grid added nothing she may read that was not already there,
     * and the sentence under it was untrue of her own work. A sales ground's participant now gets
     * no second copy of `workRecords` at all, deal grid or forecast - this is the fix, not a
     * regression, so the old assertion is replaced rather than kept.
     */
    expect(within(whole).queryByText('Greenhill Mart')).toBeNull()
    expect(within(whole).queryByText('Westgate Deli')).toBeNull()
    expect(within(whole).queryByText('Every deal, day by day')).toBeNull()

    /*
     * BOARD REVIEW, SALES PIECE D, ITEM 5: "FORECAST" IS ABOUT THE WHOLE TEAM, SO SHE READS IT
     * TOO, INSIDE THE FOLD, BESIDE "BY AREA" - it used to be sent to her and drawn nowhere at all.
     */
    expect(within(whole).getByText('Where the sales numbers are likely to end up')).toBeTruthy()
    expect(within(whole).getByText('This quarter')).toBeTruthy()
  })

  it('says the picture is shared once the server itself says `teamPicture.shared`, not from a round count, and links to it', async () => {
    me = { id: 'u-miriam', firstName: 'Miriam', role: 'MEMBER' }
    renderBoard(board({ teamPicture: { shared: true } }))
    await screen.findByRole('heading', { name: 'Sales team, Q3' })
    /*
     * BOARD REVIEW, SALES PIECE C, ITEM 6: "IT IS READY"/"IT IS BELOW" REPLACED. "Today's team
     * picture is ready." (the heading) and "It is below, with everything else from this check-in."
     * (the line under it) both claimed something about where the content was without giving a way
     * there - everything past this view sits inside a closed fold. The heading now says "...is
     * shared." and a real control opens that fold and jumps to it, which the old assertions never
     * covered because there was nothing to click.
     */
    expect(screen.getByText('Today’s team picture is shared.')).toBeTruthy()
    expect(screen.queryByText('Today’s team picture isn’t shared yet.')).toBeNull()
    expect(screen.queryByText('It is below, with everything else from this check-in.')).toBeNull()
    expect(screen.getByText('Your own report is ready now.')).toBeTruthy()
    /*
     * PROJECT BOARD REVIEW 1, FIX 6: POINTS AT THE TEAM REPORT, NOT A FOLD WITH NO TEAM PICTURE
     * IN IT. "Open today's team picture below." used to open and scroll to "The whole check-in"
     * fold, which never actually holds a team picture - only everything else this board sends
     * (By area, coaching, the switchboard's own sections).
     *
     * SCREEN FAULT 4: AND NOT TO `/grounds/:id/report` EITHER - THAT IS ONLY A REDIRECT
     * (ReportPage.tsx) TO THIS VERY PAGE'S OWN "My work" TAB, FOR A PARTICIPANT. Walked on a
     * phone: landed on `?tab=report` showing about 350px of blank gap over two closed rows
     * squeezed together, with the tab bar underlining "My work" - never the session's own report
     * page. Updated to the same place "Read your own report" already opens
     * (`myLatestCheckInId` - the session this team picture is for), the direct route, like that
     * link above.
     */
    const open = screen.getByRole('link', { name: 'Open today’s team picture.' })
    expect(open).toHaveAttribute('href', '/checkin/ci-miriam-1/report')
  })

  it('reads "Your share" when the engine sends one, ending with who else sees it', async () => {
    me = { id: 'u-miriam', firstName: 'Miriam', role: 'MEMBER' }
    renderBoard(board({
      yourShare: [{ objectiveId: 'o1', says: '4 of your 5 sales so far; 3 paid.', whoSees: 'Only you and Wairimu see your share.' }],
    }))
    await screen.findByRole('heading', { name: 'Sales team, Q3' })
    expect(screen.getByText('4 of your 5 sales so far; 3 paid.')).toBeTruthy()
    expect(screen.getByText('Only you and Wairimu see your share.')).toBeTruthy()
  })

  it('reads one plain sentence, not a missing section, when she has no deals of her own', async () => {
    me = { id: 'u-miriam', firstName: 'Miriam', role: 'MEMBER' }
    renderBoard(board({
      workRecords: [{ section: 'Deal grid', holds: 'deals', state: 'filled' as const, stages: ['Need'], rows: [] }],
    }))
    await screen.findByRole('heading', { name: 'Sales team, Q3' })
    expect(screen.getByText('Your deals, day by day')).toBeTruthy()
    expect(screen.getByText('You have no deals on record yet.')).toBeTruthy()
  })

  it('Wairimu, who runs the check-in, reads her board exactly as before - no personal view, no fold', async () => {
    me = { id: 'u-wairimu', firstName: 'Wairimu', role: 'MEMBER' }
    renderBoard(board({ myParticipantId: 'p-wairimu', canEditFrame: true }))
    await screen.findByRole('heading', { name: 'Sales team, Q3' })
    expect(screen.queryByText('Today’s team picture isn’t shared yet.')).toBeNull()
    expect(screen.queryByText('Your deals, day by day')).toBeNull()
    expect(screen.queryByText('The whole check-in')).toBeNull()
    // Her own and Aisha's deals are both plainly on the page, not behind a fold.
    expect(screen.getByText('Westgate Deli')).toBeTruthy()
    expect(screen.getByText('Greenhill Mart')).toBeTruthy()
  })
})
