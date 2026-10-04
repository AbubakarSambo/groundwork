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
  continueOptions: [
    { key: 'keepThisGroundRunning', label: 'Keep this Ground running' },
    { key: 'startRecommendedGrounds', label: 'Start recommended Grounds' },
    { key: 'turnOnRelevantSuites', label: 'Turn on relevant suites' },
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

  it('never shows a bare reveal number, only a plain sentence', () => {
    render(<TheEndOfMonthRead read={fixture} onContinue={() => {}} />)
    expect(screen.getByText('3 projects that could have their own Ground.')).toBeTruthy()
    expect(screen.getByText('17 active commitments.')).toBeTruthy()
    expect(screen.queryByText(/^3$/)).toBeNull()
    expect(screen.queryByText(/^17$/)).toBeNull()
  })

  it('draws at most one navy button, and calls back with the chosen option', () => {
    const onContinue = vi.fn()
    render(<TheEndOfMonthRead read={fixture} onContinue={onContinue} />)
    const navyButtons = document.querySelectorAll('.gwui-btn-primary')
    expect(navyButtons.length).toBe(1)
    fireEvent.click(screen.getByText('Keep this Ground running'))
    expect(onContinue).toHaveBeenCalledWith(fixture.continueOptions[0])
    fireEvent.click(screen.getByText('Continue Groundwork for the team'))
    expect(onContinue).toHaveBeenCalledWith(fixture.continueOptions[3])
  })
})
