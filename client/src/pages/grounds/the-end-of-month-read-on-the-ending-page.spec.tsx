import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import EndingPage from './EndingPage'
import { groundsApi } from '@/api/grounds'
import { boardApi } from '@/api/board'
import type { TheEndOfMonthRead } from '@/api/anchorShapes'

/**
 * PIECE 33: THE END-OF-MONTH PAGE, ON EndingPage.tsx (plan section 5, row 13;
 * docs/answers-from-engine.md, "Request 147", `TheEndOfMonthRead`). Lead only
 * (`canEditFrame`), only for an anchor Ground (`anchorScenarioOn`), and only once the engine has
 * actually served `theEndOfMonthRead` on the board.
 */
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn() } }))
vi.mock('@/api/board', () => ({ boardApi: { get: vi.fn() } }))
vi.mock('@/components/gw/ResolutionPanel', () => ({ ResolutionPanel: () => <div data-testid="resolution-panel" /> }))
vi.mock('@/components/gw/Suggestions', () => ({ SuggestionsForTheLead: () => null }))

const read: TheEndOfMonthRead = {
  yourOwnWords: 'Everyone is delivering their own piece but nobody seems to understand what it takes to keep this company moving.',
  whatWeFound: ['The team saw their own work, but not how it connected to the wider outcome.'],
  whatTheyNowUnderstandDifferently: [],
  whatTheyAreDoingDifferently: [],
  whatYourTeamContributed: [],
  peopleWhoHelpedMoveTheThinking: [],
  whatYouChangedAsALead: [],
  whatIsStillStuck: [],
  whatShouldHappenNext: [],
  reveal: {
    projectsThatCouldHaveTheirOwnGround: 3,
    sharedObjectivesWorthTracking: 2,
    workingRelationshipsNeedingAlignment: 4,
    activeCommitments: 17,
    teamGeneratedIdeas: 7,
    suitesRelevantToWorkAlreadyBeingDone: 3,
  },
  revealSaid: { heading: 'This started as one check-in.', intro: 'During the month, Groundwork also found this.', lines: ['Groundwork found one project that could have a check-in of its own.'], closing: 'Your team has already started building its Groundwork.' },
  continueOptions: [{ key: 'keepThisGroundRunning', label: 'Keep this check-in running' }],
}

function board(opts: { canEditFrame: boolean; anchorScenarioOn: boolean; theEndOfMonthRead?: TheEndOfMonthRead }) {
  return {
    groundId: 'g1', renders: true, mode: 'SHARED', family: 'UPDATE', sections: [],
    title: 'Help my team understand', scenario: null, coverageVariant: 'NONE',
    myParticipantId: 'p1', canEditFrame: opts.canEditFrame, readOnlyNote: '',
    anchorScenarioOn: opts.anchorScenarioOn,
    ...(opts.theEndOfMonthRead ? { theEndOfMonthRead: opts.theEndOfMonthRead } : {}),
    participants: [],
  }
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds/g1/end']}>
        <Routes><Route path="/grounds/:id/end" element={<EndingPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  ;(groundsApi.get as any).mockResolvedValue({ label: 'Sales team, Q3' })
})

describe('the end-of-month read, on the ending page', () => {
  it('draws nothing when the switch is off, even for the lead with the field served', async () => {
    ;(boardApi.get as any).mockResolvedValue(board({ canEditFrame: true, anchorScenarioOn: false, theEndOfMonthRead: read }))
    renderPage()
    await screen.findByTestId('resolution-panel')
    expect(screen.queryByText('You wanted your team to understand...')).toBeNull()
  })

  it('draws nothing when the field is not served, even with the switch on', async () => {
    ;(boardApi.get as any).mockResolvedValue(board({ canEditFrame: true, anchorScenarioOn: true }))
    renderPage()
    await screen.findByTestId('resolution-panel')
    expect(screen.queryByText('You wanted your team to understand...')).toBeNull()
  })

  it('draws nothing for a reader who does not run the check-in, even when both are true', async () => {
    ;(boardApi.get as any).mockResolvedValue(board({ canEditFrame: false, anchorScenarioOn: true, theEndOfMonthRead: read }))
    renderPage()
    await screen.findByTestId('resolution-panel')
    expect(screen.queryByText('You wanted your team to understand...')).toBeNull()
  })

  it("draws the lead's own words and the reveal when both are true, for whoever runs it", async () => {
    ;(boardApi.get as any).mockResolvedValue(board({ canEditFrame: true, anchorScenarioOn: true, theEndOfMonthRead: read }))
    renderPage()
    expect(await screen.findByText('You wanted your team to understand...')).toBeTruthy()
    expect(screen.getByText(`“${read.yourOwnWords}”`)).toBeTruthy()
    expect(screen.getByText('Keep this check-in running')).toBeTruthy()
  })
})
