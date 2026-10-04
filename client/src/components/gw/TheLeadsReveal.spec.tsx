import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TheLeadsReveal } from './TheLeadsReveal'
import type { TheLeadsReveal as TheLeadsRevealShape } from '@/api/anchorShapes'

/**
 * PIECE 9: THE LEAD'S REVEAL (plan section 5, row 3; docs/answers-from-engine.md, "Request 147").
 * The fixture's words are Hafsah's own, from docs/anchor-scenario.md sections 11 and 12.
 */
const fixture: TheLeadsRevealShape = {
  title: 'Help my team understand',
  subtitle: 'One-month Groundwork',
  carrying: 'Everyone is delivering their own piece but nobody seems to understand what it takes to keep this company moving.',
  whatTheTeamNeedsToUnderstand: 'How what each person does connects to keeping the company growing.',
  sharedWithTheTeam: true,
  whoYouAreTryingToMove: 'The sales and delivery team.',
  seeingToday: 'People doing their own job well, without seeing how it connects to the wider outcome.',
  whatMeaningfulChangeWouldLookLike: ['People connecting their own work to the bigger picture without being asked.'],
  whatGroundworkWillExplore: ['What the team sees today, in their own words.'],
  howIWillWorkWithYourTeam: [
    { key: 'understand', heading: 'Understand', sentence: 'Learn how each person currently sees their work and the wider outcome.' },
    { key: 'followThrough', heading: 'Follow through', sentence: 'Remember commitments and return to them.' },
  ],
}

describe('TheLeadsReveal, piece 9', () => {
  it('draws nothing when the reveal is not served', () => {
    const { container } = render(<TheLeadsReveal reveal={undefined} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('draws nothing when the reveal is explicitly null', () => {
    const { container } = render(<TheLeadsReveal reveal={null} />)
    expect(container).toBeEmptyDOMElement()
  })

  it("draws Hafsah's own words when the engine serves the reveal", () => {
    render(<TheLeadsReveal reveal={fixture} />)
    expect(screen.getByText('Help my team understand')).toBeTruthy()
    expect(screen.getByText('One-month Groundwork')).toBeTruthy()
    expect(screen.getByText(fixture.carrying!)).toBeTruthy()
    expect(screen.getByText(fixture.seeingToday!)).toBeTruthy()
    expect(screen.getByText(fixture.whatTheTeamNeedsToUnderstand!)).toBeTruthy()
    expect(screen.getByText("How I'll work with your team")).toBeTruthy()
    expect(screen.getByText('Follow through')).toBeTruthy()
    expect(screen.getByText('Remember commitments and return to them.')).toBeTruthy()
  })

  it("holds back What you need the team to understand until the lead has shared it", () => {
    render(<TheLeadsReveal reveal={{ ...fixture, sharedWithTheTeam: false, whatTheTeamNeedsToUnderstand: 'Something not yet shared.' }} />)
    expect(screen.queryByText('Something not yet shared.')).toBeNull()
    expect(screen.queryByText('What you need the team to understand')).toBeNull()
  })

  it("draws nothing for carrying and seeing today when the engine withholds them (not the lead reading)", () => {
    render(<TheLeadsReveal reveal={{ ...fixture, carrying: null, seeingToday: null }} />)
    expect(screen.queryByText("What you're carrying")).toBeNull()
    expect(screen.queryByText("What you're seeing today")).toBeNull()
  })
})
