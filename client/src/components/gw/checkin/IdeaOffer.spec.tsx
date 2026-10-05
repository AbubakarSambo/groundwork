import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { IdeaOffer } from './IdeaOffer'
import type { TheIdeaOfferInTheCheckIn } from '@/api/anchorShapes'

/**
 * PIECE 21: THE YES IN THE PERSON'S CHECK-IN (docs/answers-from-engine.md, "Request 149,
 * missing (1)", `TheIdeaOfferInTheCheckIn`). The fixture's words are Hafsah's own.
 */
const fixture: TheIdeaOfferInTheCheckIn = {
  idea: 'We should review client work a month before the project closes.',
  question: 'That sounds like a concrete idea. Want me to capture it for the team?',
  whoWillSeeIt: 'Everyone in this check-in will see it, with your name on it.',
  yes: 'Yes, capture it',
  no: 'Not now',
}

describe('IdeaOffer, piece 21', () => {
  it('draws nothing when there is no offer', () => {
    const { container } = render(<IdeaOffer offer={undefined} onPick={() => {}} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('draws nothing when the offer is explicitly null', () => {
    const { container } = render(<IdeaOffer offer={null} onPick={() => {}} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the idea quoted, the question, who will see it, and both answers', () => {
    render(<IdeaOffer offer={fixture} onPick={() => {}} />)
    expect(screen.getByText(`“${fixture.idea}”`)).toBeTruthy()
    expect(screen.getByText(fixture.question)).toBeTruthy()
    expect(screen.getByText(fixture.whoWillSeeIt)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Yes, capture it' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Not now' })).toBeTruthy()
  })

  it('calls back with the exact words pressed', () => {
    const onPick = vi.fn()
    render(<IdeaOffer offer={fixture} onPick={onPick} />)
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }))
    expect(onPick).toHaveBeenCalledWith('Not now')
  })
})
