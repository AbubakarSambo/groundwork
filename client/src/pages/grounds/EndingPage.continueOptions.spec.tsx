import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import EndingPage from './EndingPage'

/**
 * ITEM 3: THE END-OF-MONTH READ'S FOUR CONTINUE OPTIONS, EACH GOING WHERE THE ANSWER SAYS
 * (docs/answers-from-engine.md, "Request 149 (6 of 6)", "Answer (3)"). Before this, every option
 * navigated to the same `/billing` route regardless of its key. The fixture's words and keys are
 * exactly as the engine serves `continueOptions` (TheEndOfMonthRead.spec.tsx's own fixture).
 */

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn().mockResolvedValue({ id: 'g1', label: 'Help my team understand' }) } }))
vi.mock('@/api/suggestions', () => ({
  suggestionsApi: { listForLead: vi.fn().mockResolvedValue([]), listForPerson: vi.fn().mockResolvedValue([]) },
  isForTheLead: () => true,
}))
vi.mock('@/api/resolution', () => ({ resolutionApi: { get: vi.fn().mockResolvedValue(null), propose: vi.fn() } }))

const theEndOfMonthRead = {
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
    projectsThatCouldHaveTheirOwnGround: 1,
    sharedObjectivesWorthTracking: 0,
    workingRelationshipsNeedingAlignment: 0,
    activeCommitments: 0,
    teamGeneratedIdeas: 0,
    suitesRelevantToWorkAlreadyBeingDone: 0,
  },
  continueOptions: [
    { key: 'keepThisGroundRunning', label: 'Keep this Ground running' },
    { key: 'startRecommendedGrounds', label: 'Start recommended Grounds' },
    { key: 'turnOnRelevantSuites', label: 'Turn on relevant suites' },
    { key: 'continueGroundworkForTheTeam', label: 'Continue Groundwork for the team' },
  ],
}

const mockBoardGet = vi.fn()
vi.mock('@/api/board', () => ({ boardApi: { get: (...a: any[]) => mockBoardGet(...a) } }))

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds/g1/end']}>
        <Routes>
          <Route path="/grounds/:id/end" element={<EndingPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('EndingPage, the four continue options', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    mockBoardGet.mockReset()
    mockBoardGet.mockResolvedValue({
      groundId: 'g1', renders: true, canEditFrame: true, anchorScenarioOn: true,
      theEndOfMonthRead,
    })
  })

  it('"Keep this Ground running" and "Continue Groundwork for the team" open the plan choice', async () => {
    renderPage()
    fireEvent.click(await screen.findByText('Keep this Ground running'))
    expect(mockNavigate).toHaveBeenCalledWith('/settings/billing')
    fireEvent.click(screen.getByText('Continue Groundwork for the team'))
    expect(mockNavigate).toHaveBeenCalledWith('/settings/billing')
  })

  it('"Start recommended Grounds" opens this Ground\'s own board', async () => {
    renderPage()
    fireEvent.click(await screen.findByText('Start recommended Grounds'))
    expect(mockNavigate).toHaveBeenCalledWith('/grounds/g1/board')
  })

  it('"Turn on relevant suites" opens the Suites page', async () => {
    renderPage()
    fireEvent.click(await screen.findByText('Turn on relevant suites'))
    expect(mockNavigate).toHaveBeenCalledWith('/settings/suites')
  })

  it('draws nothing from the end-of-month read for someone who may not run this check-in', async () => {
    mockBoardGet.mockResolvedValue({
      groundId: 'g1', renders: true, canEditFrame: false, anchorScenarioOn: true,
      theEndOfMonthRead,
    })
    renderPage()
    await waitFor(() => expect(screen.getByText('Help my team understand')).toBeTruthy())
    expect(screen.queryByText('Keep this Ground running')).toBeNull()
  })
})
