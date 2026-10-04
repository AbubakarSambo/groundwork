import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TheMonthBoard } from './TheMonthBoard'
import type { TheMonthBoard as TheMonthBoardShape } from '@/api/anchorShapes'

/**
 * PIECES 12, 13 AND 20: THE MONTH BOARD, "Are we moving together?" (plan section 5, row 6;
 * docs/answers-from-engine.md, "Request 147", `TheMonthBoard`). The fixture's words are Hafsah's
 * own, from docs/anchor-scenario.md section 24 and the engine's own example sentence.
 */
const fixture: TheMonthBoardShape = {
  question: 'Are we moving together?',
  weekOfTheMonth: 3,
  lenses: [
    { key: 'understanding', heading: 'Understanding', question: 'Do people see the bigger picture?', reading: 'Most of the team now connects their own work to the wider outcome.' },
    { key: 'ownership', heading: 'Ownership', question: 'Are they carrying outcomes rather than only assigned tasks?', reading: 'Three people have taken on something nobody asked them to.' },
    { key: 'contribution', heading: 'Contribution', question: 'Are they bringing ideas, insights and help?', reading: 'The team has raised two ideas this month.' },
    { key: 'action', heading: 'Action', question: 'Is understanding translating into actual movement?', reading: 'Commitments made this month are mostly being kept.' },
  ],
  whatIsMoving: ['Omar connected a project delay to a renewal risk.'],
  whatTheTeamIsContributing: ['A proposal to review client work a month before it ends.'],
  peopleHelpingThingsMove: [{ name: 'Omar', sentence: 'Connected a project delay to a renewal risk and raised it before it became a customer issue.' }],
  wherePerspectivesDiffer: ['Lucy thinks onboarding stock was slow; the lead thinks she waited too long to raise it.'],
  whatIsStillGettingInTheWay: ['Price objections, raised 9 times.'],
  whatGroundworkIsWorkingOnNext: ['Following up with the two people who have not checked in this week.'],
}

describe('TheMonthBoard, pieces 12/13/20', () => {
  it('draws nothing when the month board is not served', () => {
    const { container } = render(<TheMonthBoard monthBoard={undefined} />)
    expect(container).toBeEmptyDOMElement()
  })

  it("draws the question, the week, the four lenses as sentences, and the six parts", () => {
    render(<TheMonthBoard monthBoard={fixture} />)
    expect(screen.getByText('Are we moving together?')).toBeTruthy()
    expect(screen.getByText('Week 3 of the month')).toBeTruthy()
    expect(screen.getByText('Understanding')).toBeTruthy()
    expect(screen.getByText('Do people see the bigger picture?')).toBeTruthy()
    expect(screen.getByText('Most of the team now connects their own work to the wider outcome.')).toBeTruthy()
    expect(screen.getByText("What's moving")).toBeTruthy()
    expect(screen.getByText('Omar connected a project delay to a renewal risk.')).toBeTruthy()
    expect(screen.getByText('People helping things move')).toBeTruthy()
    expect(screen.getByText('Connected a project delay to a renewal risk and raised it before it became a customer issue.')).toBeTruthy()
    expect(screen.getByText("What's still getting in the way")).toBeTruthy()
    expect(screen.getByText('What Groundwork is working on next')).toBeTruthy()
  })

  it('never draws a score or a number for a lens, only its reading as a sentence', () => {
    render(<TheMonthBoard monthBoard={fixture} />)
    expect(screen.queryByText(/\/10/)).toBeNull()
    expect(screen.queryByText(/^\d+%$/)).toBeNull()
  })
})
