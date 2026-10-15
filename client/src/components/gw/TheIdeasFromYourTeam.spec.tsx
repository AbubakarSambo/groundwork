import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TheIdeasFromYourTeam } from './TheIdeasFromYourTeam'
import type { TheIdeasFromYourTeam as TheIdeasFromYourTeamShape } from '@/api/anchorShapes'

/**
 * PIECE 19/20: "IDEAS FROM YOUR TEAM" (docs/answers-from-engine.md, "Request 149, missing (1)").
 * The fixture's words are Hafsah's own, exactly as the answer gives them.
 */
const fixture: TheIdeasFromYourTeamShape = {
  heading: 'Ideas from your team',
  ideas: [
    { id: 'idea-1', title: 'Client review one month before project close', raisedBy: 'Raised by Lucy.', similarNeedsSentence: 'Similar needs have appeared across three check-ins.' },
    { id: 'idea-2', title: 'A shared template for the weekly update', raisedBy: 'Raised by Baraka.', similarNeedsSentence: null },
  ],
  whenThereAreNone: 'No idea from your team has been captured yet.',
}

describe('TheIdeasFromYourTeam, piece 19/20', () => {
  it('draws nothing when it is not served', () => {
    const { container } = render(<TheIdeasFromYourTeam ideasFromYourTeam={undefined} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('draws the heading and each idea, raised by name, with its similar-needs sentence', () => {
    render(<TheIdeasFromYourTeam ideasFromYourTeam={fixture} />)
    expect(screen.getByText('Ideas from your team')).toBeTruthy()
    expect(screen.getByText('Client review one month before project close')).toBeTruthy()
    expect(screen.getByText('Raised by Lucy.')).toBeTruthy()
    expect(screen.getByText('Similar needs have appeared across three check-ins.')).toBeTruthy()
  })

  it('leaves out the similar-needs sentence when it has only appeared once', () => {
    render(<TheIdeasFromYourTeam ideasFromYourTeam={fixture} />)
    expect(screen.getByText('A shared template for the weekly update')).toBeTruthy()
    expect(screen.getByText('Raised by Baraka.')).toBeTruthy()
  })

  it('draws the heading with the one sentence, when there are no ideas yet', () => {
    render(<TheIdeasFromYourTeam ideasFromYourTeam={{ ...fixture, ideas: [] }} />)
    expect(screen.getByText('Ideas from your team')).toBeTruthy()
    expect(screen.getByText('No idea from your team has been captured yet.')).toBeTruthy()
  })
})
