import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TheBoardsOwnReadSection } from './TheSwitchboardsSections'

/**
 * THE BOARD'S OWN READ, AS THE LEAD READS IT (matter.jpg, gov.jpg). The callouts the prototype's boards hold that only a written read of
 * the record can give. Each is a plain passage under the prototype's own heading, with how it is known; a piece the server did not send
 * draws nothing, and no heading stands over nothing.
 */
const data = {
  howKnown: 'Written from what people said.',
  pieces: [
    { id: 'moreConfident', heading: 'More confident than the evidence allows', form: 'one' as const, place: 'top' as const, sentences: [{ says: 'Leila says the contract supports you, but the original contract has not arrived.', how: 'said' as const }] },
    { id: 'mayChangeStrategy', heading: 'This may change the strategy', form: 'one' as const, place: 'top' as const, sentences: [{ says: 'Tom wants to lead with the limitation point, and nobody has decided yet.', how: 'said' as const }] },
    { id: 'ministryQuestions', heading: 'Questions for the ministry', form: 'list' as const, place: 'end' as const, sentences: [
      { says: 'Officers in 3 counties raised the registration rule.', how: 'said' as const },
      { says: 'Paystack shows 31 paid subscriptions.', how: 'shown' as const },
    ] },
  ],
}

describe('the board’s own read as the lead reads it', () => {
  it('draws the callouts near the top under their own headings, with how each is known', () => {
    render(<TheBoardsOwnReadSection data={data} place="top" />)
    expect(screen.getByText('More confident than the evidence allows')).toBeInTheDocument()
    expect(screen.getByText('Leila says the contract supports you, but the original contract has not arrived.')).toBeInTheDocument()
    expect(screen.getByText('This may change the strategy')).toBeInTheDocument()
    /* Said once where the board starts, not under every callout; only the exception is marked. */
    expect(screen.queryByText('Said in the check-ins, not shown by a document.')).not.toBeInTheDocument()
    expect(screen.queryByText('Questions for the ministry')).not.toBeInTheDocument()
  })
  it('draws a list in the same container as a passage, marking only the line a document or system shows', () => {
    render(<TheBoardsOwnReadSection data={data} place="end" />)
    expect(screen.getByText('Questions for the ministry')).toBeInTheDocument()
    expect(screen.getByText('Officers in 3 counties raised the registration rule.')).toBeInTheDocument()
    expect(screen.queryByText('Said in the check-ins, not shown by a document.')).not.toBeInTheDocument()
    expect(screen.getAllByText(/Shown by a document\./)).toHaveLength(1)
  })
  it('draws nothing where the server sent nothing', () => {
    const { container: a } = render(<TheBoardsOwnReadSection data={undefined} place="top" />)
    expect(a).toBeEmptyDOMElement()
    const { container: b } = render(<TheBoardsOwnReadSection data={{ howKnown: '', pieces: [] }} place="end" />)
    expect(b).toBeEmptyDOMElement()
  })
})
