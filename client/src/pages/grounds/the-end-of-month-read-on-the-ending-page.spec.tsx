import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import EndingPage from './EndingPage'
import { groundsApi } from '@/api/grounds'
import { boardApi } from '@/api/board'
import type { TheAnchorBoardSections } from '@/api/anchorShapes'

/**
 * PIECE 33: THE END-OF-MONTH PAGE, ON EndingPage.tsx (plan section 5, row 13).
 *
 * UPDATED FOR DECISION 114 (8 October evening; docs/answers-from-engine.md, "8 October (later):
 * the anchor through the ordinary routes, route by route", table row `theEndOfTheMonth`): "who
 * reads a section is now decided by the server." `EndingPage.tsx` no longer re-checks
 * `canEditFrame` or `anchorScenarioOn` - it draws whatever `theEndOfTheMonth` the board payload
 * itself carries, trusting that the engine only ever fills the field for whoever runs the
 * check-in, once the month has run. So the old tests that handed a reader who may not run it the
 * field anyway, or handed the lead the field with the switch off, are gone - that combination
 * cannot happen on a real payload, which is exactly the point of trusting it rather than
 * re-checking it on screen (the same change already made to `the-month-board.spec.tsx`) - replaced
 * below by the realistic shape of each reader's own payload: the field simply absent when it is
 * not theirs to read.
 */
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn() } }))
vi.mock('@/api/board', () => ({ boardApi: { get: vi.fn() } }))
vi.mock('@/components/gw/ResolutionPanel', () => ({ ResolutionPanel: () => <div data-testid="resolution-panel" /> }))
vi.mock('@/components/gw/Suggestions', () => ({ SuggestionsForTheLead: () => null }))

const theEndOfTheMonth: NonNullable<TheAnchorBoardSections['theEndOfTheMonth']> = {
  heading: 'You wanted your team to understand...',
  yourOwnWords: 'Everyone is delivering their own piece but nobody seems to understand what it takes to keep this company moving.',
  parts: [
    { heading: 'What we found', items: ['The team saw their own work, but not how it connected to the wider outcome.'] },
  ],
  people: [],
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

function board(opts?: { theEndOfTheMonth?: typeof theEndOfTheMonth }) {
  return {
    groundId: 'g1', renders: true, mode: 'SHARED', family: 'UPDATE', sections: [],
    title: 'Help my team understand', scenario: null, coverageVariant: 'NONE',
    myParticipantId: 'p1', readOnlyNote: '',
    ...(opts?.theEndOfTheMonth ? { theEndOfTheMonth: opts.theEndOfTheMonth } : {}),
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
  it('draws nothing when the field is not served (the switch off, any other check-in, or a reader who does not run it)', async () => {
    ;(boardApi.get as any).mockResolvedValue(board())
    renderPage()
    await screen.findByTestId('resolution-panel')
    expect(screen.queryByText('You wanted your team to understand...')).toBeNull()
  })

  it("draws the lead's own words and the reveal whenever the payload carries the section", async () => {
    ;(boardApi.get as any).mockResolvedValue(board({ theEndOfTheMonth }))
    renderPage()
    expect(await screen.findByText('You wanted your team to understand...')).toBeTruthy()
    expect(screen.getByText(`“${theEndOfTheMonth.yourOwnWords}”`)).toBeTruthy()
    expect(screen.getByText('Keep this check-in running')).toBeTruthy()
  })
})
