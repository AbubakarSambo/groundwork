import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NineColumnsIsNotAPhoneScreen, theShapeOfIt, theSentenceFor } from './nine-columns-is-not-a-phone-screen'

/**
 * U.10 REVIEW: A SENTENCE, NOT "Not started for 1 of 1, and not on the other 1."
 *
 * Read on a live admin board about Faraji Odhiambo: he is on one session this phase and has not
 * started it, and the phone-width grid said the same number twice, neither instance naming which
 * session it was. This checks the rendered phone view, as an admin reads it, says a sentence a
 * person can follow.
 */
describe('the sessions-this-phase row, as a sentence', () => {
  it('names the one session, for somebody on only one', () => {
    const shape = theShapeOfIt({ '1': 'not-started' }, [1])
    expect(theSentenceFor('Faraji Odhiambo', shape)).toBe('Faraji Odhiambo has not started session 1.')
  })

  it('renders that sentence on the phone-width grid', () => {
    render(
      <NineColumnsIsNotAPhoneScreen
        rows={[{ participantId: 'p1', name: 'Faraji Odhiambo', cells: { '1': 'not-started' } }]}
        sessions={[1]}
      />,
    )
    expect(screen.getByText('Faraji Odhiambo has not started session 1.')).toBeTruthy()
    expect(screen.queryByText(/1 of 1/)).toBeNull()
  })

  it('counts several sessions in one phrase, not doubled', () => {
    const shape = theShapeOfIt({ '1': 'done', '2': 'done', '3': 'done' }, [1, 2, 3])
    expect(theSentenceFor('Aisha Otieno', shape)).toBe('Aisha Otieno has checked in for 3 of 3 sessions this phase.')
  })

  it('says who was not part of the run at all, plainly', () => {
    const shape = theShapeOfIt({}, [1, 2])
    expect(theSentenceFor('A colleague', shape)).toBe('A colleague is not on any of these sessions.')
  })
})
