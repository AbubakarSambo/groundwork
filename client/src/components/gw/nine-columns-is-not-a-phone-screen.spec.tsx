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

  /*
   * U.10 RE-REVIEW ITEM E: SAY NOTHING ABOUT A SESSION THAT HAS NOT OPENED.
   *
   * "Faraji Odhiambo has not started session 1, and was not part of the other 1." named a second
   * session on the grid that had not opened yet - he could not possibly have been "not part of" it.
   * `openSessions` lets the caller say which sessions actually count; a session left out of it is
   * left out of the sentence entirely.
   */
  it('drops a session that has not opened from the sentence, when openSessions says so', () => {
    render(
      <NineColumnsIsNotAPhoneScreen
        rows={[{ participantId: 'p1', name: 'Faraji Odhiambo', cells: { '1': 'not-started' } }]}
        sessions={[1, 2]}
        openSessions={[1]}
      />,
    )
    expect(screen.getByText('Faraji Odhiambo has not started session 1.')).toBeTruthy()
    expect(screen.queryByText(/the other/)).toBeNull()
  })
})
