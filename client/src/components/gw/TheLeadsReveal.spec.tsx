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
    expect(screen.queryByText('Only you can see this for now.')).toBeNull()
    expect(screen.getByText("How I'll work with your team")).toBeTruthy()
    expect(screen.getByText('Follow through')).toBeTruthy()
    expect(screen.getByText('Remember commitments and return to them.')).toBeTruthy()
  })

  it("always shows the lead their own What you need the team to understand, with a note when it isn't shared yet", () => {
    // Updated: this is the lead's own reveal, read on the lead's own set-up screen. Decision 96
    // item 8's sharedWithTeam gate limits what the TEAM is shown elsewhere; it never hid the
    // lead's own words from the lead. The old test pinned that wrong gate.
    render(<TheLeadsReveal reveal={{ ...fixture, sharedWithTheTeam: false, whatTheTeamNeedsToUnderstand: 'Something not yet shared.' }} />)
    expect(screen.getByText('Something not yet shared.')).toBeTruthy()
    expect(screen.getByText('What you need the team to understand')).toBeTruthy()
    expect(screen.getByText('Only you can see this for now.')).toBeTruthy()
  })

  it("draws nothing for carrying and seeing today when the engine withholds them (not the lead reading)", () => {
    render(<TheLeadsReveal reveal={{ ...fixture, carrying: null, seeingToday: null }} />)
    expect(screen.queryByText("What you're carrying")).toBeNull()
    expect(screen.queryByText("What you're seeing today")).toBeNull()
  })

  /**
   * BUG FOUND WHILE SCREENSHOTTING THE ANCHOR'S SET-UP SCREEN (decision 114 work, 8 October 2026):
   * the seven items and this list are pulled from the lead's own words by a model step the engine
   * has not finished (see the file's own comment on `leadsReveal`), so a real, partially-filled
   * reveal can arrive with none of these three lists at all - not an empty array, genuinely absent
   * - even though the type says they are always arrays. The whole set-up screen crashed to
   * `PageCrash`, not only this panel, because `.length` was read straight off them. Caught
   * `whatMeaningfulChangeWouldLookLike` and `whatGroundworkWillExplore` first; re-taking the
   * screenshot with that fix in place turned up the same crash a third time, on
   * `howIWillWorkWithYourTeam`, which this test now also covers rather than leaving to be found a
   * fourth time by whoever screenshots this next.
   */
  it('draws the rest of the reveal rather than crashing when all three lists are missing entirely', () => {
    const partial = { ...fixture } as any
    delete partial.whatMeaningfulChangeWouldLookLike
    delete partial.whatGroundworkWillExplore
    delete partial.howIWillWorkWithYourTeam
    render(<TheLeadsReveal reveal={partial} />)
    expect(screen.getByText('Help my team understand')).toBeTruthy()
    expect(screen.getByText(fixture.carrying!)).toBeTruthy()
    expect(screen.queryByText('What meaningful change would look like')).toBeNull()
    expect(screen.queryByText('What Groundwork will explore')).toBeNull()
    expect(screen.queryByText("How I'll work with your team")).toBeNull()
  })
})
