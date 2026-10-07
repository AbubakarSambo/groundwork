import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TheEndOfMonthRead } from './TheEndOfMonthRead'
import type { TheEndOfMonthRead as TheEndOfMonthReadShape } from '@/api/anchorShapes'

/**
 * PIECE 33: THE END-OF-MONTH PAGE (plan section 5, row 13; docs/answers-from-engine.md,
 * "Request 147", `TheEndOfMonthRead`). The fixture's words are Hafsah's own, from
 * docs/anchor-scenario.md sections 28 and 29 and the engine's own example counts.
 */
const fixture: TheEndOfMonthReadShape = {
  yourOwnWords: 'Everyone is delivering their own piece but nobody seems to understand what it takes to keep this company moving.',
  whatWeFound: ['The team saw their own work, but not how it connected to the wider outcome.'],
  whatTheyNowUnderstandDifferently: ['They now see how a delay on their side shows up as a customer risk.'],
  whatTheyAreDoingDifferently: ['Raising blockers the same day, rather than weeks later.'],
  whatYourTeamContributed: ['A proposal to review client work a month before it ends.'],
  peopleWhoHelpedMoveTheThinking: [{ name: 'Lucy', sentence: 'Connected a project delay to a renewal risk and raised it before it became a customer issue.' }],
  whatYouChangedAsALead: ['Started sharing why a deadline mattered, not only that it existed.'],
  whatIsStillStuck: ['Price objections are still raised without a competitor or a figure.'],
  whatShouldHappenNext: ['Keep checking in with the team on price objections.'],
  reveal: {
    projectsThatCouldHaveTheirOwnGround: 3,
    sharedObjectivesWorthTracking: 2,
    workingRelationshipsNeedingAlignment: 4,
    activeCommitments: 17,
    teamGeneratedIdeas: 7,
    suitesRelevantToWorkAlreadyBeingDone: 3,
  },
  revealSaid: {
    heading: 'This started as one check-in.',
    intro: 'During the month, Groundwork also found this.',
    lines: [
      'Groundwork found three projects that could have a check-in of their own.',
      'Groundwork found two shared objectives worth tracking.',
      'Groundwork found four working relationships that need aligning.',
      '17 things people said they would do are still open.',
      'Seven ideas from your team were captured.',
      'Groundwork found three suites that fit work your team is already doing.',
    ],
    closing: 'Your team has already started building its Groundwork.',
  },
  continueOptions: [
    { key: 'keepThisGroundRunning', label: 'Keep this check-in running' },
    { key: 'startRecommendedGrounds', label: 'Start the recommended check-ins' },
    { key: 'turnOnRelevantSuites', label: 'Turn on the suites that fit' },
    { key: 'continueGroundworkForTheTeam', label: 'Continue Groundwork for the team' },
  ],
}

describe('TheEndOfMonthRead, piece 33', () => {
  it('draws nothing when the read is not served', () => {
    const { container } = render(<TheEndOfMonthRead read={undefined} onContinue={() => {}} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('draws nothing when the read is explicitly null', () => {
    const { container } = render(<TheEndOfMonthRead read={null} onContinue={() => {}} />)
    expect(container).toBeEmptyDOMElement()
  })

  it("opens with the lead's own words, quoted, then the eight parts", () => {
    render(<TheEndOfMonthRead read={fixture} onContinue={() => {}} />)
    expect(screen.getByText('You wanted your team to understand...')).toBeTruthy()
    expect(screen.getByText(`“${fixture.yourOwnWords}”`)).toBeTruthy()
    expect(screen.getByText('What we found')).toBeTruthy()
    expect(screen.getByText('What they now understand differently')).toBeTruthy()
    expect(screen.getByText("What they're doing differently")).toBeTruthy()
    expect(screen.getByText('What your team contributed')).toBeTruthy()
    expect(screen.getByText('People who helped move the thinking')).toBeTruthy()
    expect(screen.getByText('Lucy')).toBeTruthy()
    expect(screen.getByText('What you changed as a lead')).toBeTruthy()
    expect(screen.getByText("What's still stuck")).toBeTruthy()
    expect(screen.getByText('What should happen next')).toBeTruthy()
  })

  it('draws what the engine serves, in plain sentences', () => {
    render(<TheEndOfMonthRead read={fixture} onContinue={() => {}} />)
    /* The engine's own sentences, drawn as served: no "Ground", and a count of nothing is a sentence, never "0 projects". */
    expect(screen.getByText('This started as one check-in.')).toBeTruthy()
    expect(screen.getByText('Groundwork found three projects that could have a check-in of their own.')).toBeTruthy()
    expect(screen.getByText('17 things people said they would do are still open.')).toBeTruthy()
    expect(screen.getByText('Your team has already started building its Groundwork.')).toBeTruthy()
    expect(document.body.textContent).not.toMatch(/\bGrounds?\b/)
    expect(screen.queryByText(/^3$/)).toBeNull()
    expect(screen.queryByText(/^17$/)).toBeNull()
  })

  /* Fault 5 of the anchor walk was "0 active commitments" beside "Three people said what they would
     do". The engine now serves the lines as sentences (`revealSaid`), saying what was not found in
     words, so the screen draws them as served and never a bare count. These two tests used to check
     the screen's own zero filter, which the engine's sentences replace. */
  it('fault 5: draws the served lines word for word, including what was not found, and never a bare 0', () => {
    const lines = ['Groundwork did not find a shared objective worth tracking.', 'Groundwork found three projects that could have a check-in of their own.']
    render(<TheEndOfMonthRead read={{ ...fixture, revealSaid: { ...fixture.revealSaid, lines } }} onContinue={() => {}} />)
    expect(screen.getByText('This started as one check-in.')).toBeTruthy()
    for (const l of lines) expect(screen.getByText(l)).toBeTruthy()
    expect(document.body.textContent).not.toMatch(/(^|\s)0 /)
  })

  it('fault 5: draws the served heading, intro and closing as they are', () => {
    render(<TheEndOfMonthRead read={fixture} onContinue={() => {}} />)
    expect(screen.getByText('During the month, Groundwork also found this.')).toBeTruthy()
    expect(screen.getByText('Your team has already started building its Groundwork.')).toBeTruthy()
  })

  it('draws at most one navy button, and calls back with the chosen option', () => {
    const onContinue = vi.fn()
    render(<TheEndOfMonthRead read={fixture} onContinue={onContinue} />)
    const navyButtons = document.querySelectorAll('.gwui-btn-primary')
    expect(navyButtons.length).toBe(1)
    fireEvent.click(screen.getByText('Keep this check-in running'))
    expect(onContinue).toHaveBeenCalledWith(fixture.continueOptions[0])
    fireEvent.click(screen.getByText('Continue Groundwork for the team'))
    expect(onContinue).toHaveBeenCalledWith(fixture.continueOptions[3])
  })
})
