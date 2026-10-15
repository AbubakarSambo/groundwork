import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import EndingPage from './EndingPage'

/**
 * ITEM 3: THE END-OF-MONTH READ'S FOUR CONTINUE OPTIONS, EACH GOING WHERE THE ANSWER SAYS
 * (docs/answers-from-engine.md, "Request 149 (6 of 6)", "Answer (3)"). Before this, every option
 * navigated to the same `/billing` route regardless of its key.
 *
 * UPDATED FOR DECISION 114 (8 October evening): the read is now the `theEndOfTheMonth` section
 * named by the switchboard, not the older `theEndOfMonthRead` field - the fixture's shape matches
 * `api/src/modules/board/the-anchor-sections-on-the-board.ts`'s own `theEndOfTheMonth`, built from
 * `parts` rather than named arrays. The last test ("draws nothing... who may not run this
 * check-in") is rewritten the same way `the-month-board.spec.tsx` already was: the server decides
 * who reads a section, so the realistic payload for that reader simply omits the field, rather than
 * this page re-checking `canEditFrame` on a payload that would never really carry both together.
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

const theEndOfTheMonth = {
  heading: 'You wanted your team to understand...',
  yourOwnWords: 'Everyone is delivering their own piece but nobody seems to understand what it takes to keep this company moving.',
  parts: [
    { heading: 'What we found', items: ['The team saw their own work, but not how it connected to the wider outcome.'] },
  ],
  people: [],
  reveal: {
    projectsThatCouldHaveTheirOwnGround: 1,
    sharedObjectivesWorthTracking: 0,
    workingRelationshipsNeedingAlignment: 0,
    activeCommitments: 0,
    teamGeneratedIdeas: 0,
    suitesRelevantToWorkAlreadyBeingDone: 0,
  },
  revealSaid: { heading: 'This started as one check-in.', intro: 'During the month, Groundwork also found this.', lines: ['Groundwork found one project that could have a check-in of its own.'], closing: 'Your team has already started building its Groundwork.' },
  continueOptions: [
    { key: 'keepThisGroundRunning', label: 'Keep this check-in running' },
    { key: 'startRecommendedGrounds', label: 'Start the recommended check-ins' },
    { key: 'turnOnRelevantSuites', label: 'Turn on the suites that fit' },
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
      groundId: 'g1', renders: true,
      theEndOfTheMonth,
    })
  })

  it('"Keep this check-in running" and "Continue Groundwork for the team" open the plan choice', async () => {
    renderPage()
    fireEvent.click(await screen.findByText('Keep this check-in running'))
    expect(mockNavigate).toHaveBeenCalledWith('/settings/billing')
    fireEvent.click(screen.getByText('Continue Groundwork for the team'))
    expect(mockNavigate).toHaveBeenCalledWith('/settings/billing')
  })

  it('"Start the recommended check-ins" opens this Ground\'s own board', async () => {
    renderPage()
    fireEvent.click(await screen.findByText('Start the recommended check-ins'))
    expect(mockNavigate).toHaveBeenCalledWith('/grounds/g1/board')
  })

  it('"Turn on the suites that fit" opens the Suites page', async () => {
    renderPage()
    fireEvent.click(await screen.findByText('Turn on the suites that fit'))
    expect(mockNavigate).toHaveBeenCalledWith('/settings/suites')
  })

  it('draws nothing from the end-of-month read for someone who may not run this check-in', async () => {
    /* The realistic shape of a reader who may not run this check-in: the server never fills
       `theEndOfTheMonth` for them at all, rather than filling it and relying on this page to hide
       it (decision 114, "who reads a section is decided by the server"). */
    mockBoardGet.mockResolvedValue({ groundId: 'g1', renders: true })
    renderPage()
    await waitFor(() => expect(screen.getByText('Help my team understand')).toBeTruthy())
    expect(screen.queryByText('Keep this check-in running')).toBeNull()
  })
})
