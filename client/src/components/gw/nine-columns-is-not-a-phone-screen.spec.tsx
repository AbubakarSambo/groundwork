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
    expect(theSentenceFor('Faraji Odhiambo', shape)).toBe('Faraji Odhiambo has not started check-in 1.')
  })

  it('renders that sentence on the phone-width grid', () => {
    render(
      <NineColumnsIsNotAPhoneScreen
        rows={[{ participantId: 'p1', name: 'Faraji Odhiambo', cells: { '1': 'not-started' } }]}
        sessions={[1]}
      />,
    )
    expect(screen.getByText('Faraji Odhiambo has not started check-in 1.')).toBeTruthy()
    expect(screen.queryByText(/1 of 1/)).toBeNull()
  })

  /*
   * Re-review, 2 October: "this phase" is product jargon nobody outside the team says - changed
   * to "so far" for every row, reader or not (the pinned wording below is updated for that reason,
   * not because the old behaviour it checked was wrong).
   */
  /* Night quality run 3 (decision 8 redone): a session the clock closed with nothing said is missed, never "Checked in". */
  it('a session closed with nothing said reads as not checked in, never as checked in', () => {
    const shape = theShapeOfIt({ '1': 'missed', '2': 'missed', '3': 'missed' }, [1, 2, 3])
    const said = theSentenceFor('Jared Okoth', shape)
    console.log(`THE LEAD READS: ${said}`)
    expect(said).not.toMatch(/has checked in/)
    expect(said).toMatch(/^Jared Okoth did not check in for/)
  })

  it('counts several sessions in one phrase, not doubled', () => {
    const shape = theShapeOfIt({ '1': 'done', '2': 'done', '3': 'done' }, [1, 2, 3])
    expect(theSentenceFor('Aisha Otieno', shape)).toBe('Aisha Otieno has checked in for 3 of 3 check-ins so far.')
  })

  it('says who was not part of the run at all, plainly', () => {
    const shape = theShapeOfIt({}, [1, 2])
    expect(theSentenceFor('A colleague', shape)).toBe('A colleague is not on any of these check-ins.')
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
    expect(screen.getByText('Faraji Odhiambo has not started check-in 1.')).toBeTruthy()
    expect(screen.queryByText(/the other/)).toBeNull()
  })

  /*
   * U.10 RE-REVIEW: "...AND WAS NOT PART OF THE OTHER 1." NAMES NO SESSION.
   *
   * Read on a live admin board: "Faraji Odhiambo has not started session 1, and was not part of the
   * other 1." says how many sessions he was not on, never which one - a second trip to the grid
   * above was needed to find it was session 2. The session is now named, the same way a lone one
   * already is ("session 1"): "...and was not part of session 2." for one, "...sessions 2 and 3."
   * for several.
   */
  it('names the one other session he was not part of, rather than only counting it', () => {
    const shape = theShapeOfIt({ '1': 'not-started' }, [1, 2])
    expect(theSentenceFor('Faraji Odhiambo', shape)).toBe('Faraji Odhiambo has not started check-in 1, and was not part of check-in 2.')
  })

  it('names several other sessions he was not part of', () => {
    const shape = theShapeOfIt({ '1': 'not-started' }, [1, 2, 3])
    expect(theSentenceFor('Faraji Odhiambo', shape)).toBe('Faraji Odhiambo has not started check-in 1, and was not part of check-ins 2 and 3.')
  })

  it('reads the same way for "A colleague"', () => {
    const shape = theShapeOfIt({ '1': 'done' }, [1, 2])
    expect(theSentenceFor('A colleague', shape)).toBe('A colleague has checked in for check-in 1, and was not part of check-in 2.')
  })

  it('renders the named session on the phone-width grid', () => {
    render(
      <NineColumnsIsNotAPhoneScreen
        rows={[{ participantId: 'p1', name: 'Faraji Odhiambo', cells: { '1': 'not-started' } }]}
        sessions={[1, 2]}
      />,
    )
    expect(screen.getByText('Faraji Odhiambo has not started check-in 1, and was not part of check-in 2.')).toBeTruthy()
    expect(screen.queryByText(/the other 1/)).toBeNull()
  })
})

/**
 * RE-REVIEW, 2 OCTOBER: THE READER'S OWN ROW, SAID TO THEM.
 *
 * Read live by Rukia Otieno, on the phone-width "Who checked in": "Rukia Otieno has checked in for
 * 2 of 2 sessions this phase." - her own name and "has", read back at her. `isReader` (known the
 * same way "Who owns what" knows it, by `participantId === myParticipantId`) switches her own
 * sentence to the second person; everyone else's sentence is untouched.
 */
describe('the reader\'s own sentence, said to them rather than about them', () => {
  it('says "You have checked in for both sessions so far." for the reader, on full attendance', () => {
    const shape = theShapeOfIt({ '1': 'done', '2': 'done' }, [1, 2])
    expect(theSentenceFor('Rukia Otieno', shape, true)).toBe('You have checked in for both check-ins so far.')
  })

  it('says "You have checked in for 2 of 3 sessions so far." for the reader, on partial attendance', () => {
    const shape = theShapeOfIt({ '1': 'done', '2': 'done', '3': 'not-started' }, [1, 2, 3])
    expect(theSentenceFor('Rukia Otieno', shape, true)).toBe('You have checked in for 2 of 3 check-ins so far.')
  })

  it('says "You have not started session 2." for the reader, named by session', () => {
    const shape = theShapeOfIt({ '2': 'not-started' }, [2])
    expect(theSentenceFor('Rukia Otieno', shape, true)).toBe('You have not started check-in 2.')
  })

  it('leaves every other person\'s sentence in the third person, unchanged apart from "so far"', () => {
    const shape = theShapeOfIt({ '1': 'done', '2': 'done' }, [1, 2])
    expect(theSentenceFor('Amani Wekesa', shape, false)).toBe('Amani Wekesa has checked in for 2 of 2 check-ins so far.')
  })

  it('renders the reader\'s own sentence in the second person on the phone-width grid, by participant id', () => {
    render(
      <NineColumnsIsNotAPhoneScreen
        rows={[
          { participantId: 'p-rukia', name: 'Rukia Otieno', cells: { '1': 'done', '2': 'done' } },
          { participantId: 'p-amani', name: 'Amani Wekesa', cells: { '1': 'done', '2': 'done' } },
        ]}
        sessions={[1, 2]}
        myParticipantId="p-rukia"
      />,
    )
    expect(screen.getByText('You have checked in for both check-ins so far.')).toBeTruthy()
    expect(screen.getByText('Amani Wekesa has checked in for 2 of 2 check-ins so far.')).toBeTruthy()
    expect(screen.queryByText(/Rukia Otieno has checked in/)).toBeNull()
  })

  it('reads everybody in the third person when no reader is given', () => {
    render(
      <NineColumnsIsNotAPhoneScreen
        rows={[{ participantId: 'p-rukia', name: 'Rukia Otieno', cells: { '1': 'done', '2': 'done' } }]}
        sessions={[1, 2]}
      />,
    )
    expect(screen.getByText('Rukia Otieno has checked in for 2 of 2 check-ins so far.')).toBeTruthy()
  })

  /*
   * Re-review, 2 October: read live, the heading above the reader's own sentence still said
   * "Rukia Otieno" - "Rukia Otieno" over "You have checked in for both sessions so far." - the
   * same row BoardPage's 1440 view already heads "You" for. The heading now matches the sentence.
   */
  it('heads the reader\'s own row "You", keeping everyone else\'s name', () => {
    render(
      <NineColumnsIsNotAPhoneScreen
        rows={[
          { participantId: 'p-rukia', name: 'Rukia Otieno', cells: { '1': 'done', '2': 'done' } },
          { participantId: 'p-amani', name: 'Amani Wekesa', cells: { '1': 'done', '2': 'done' } },
        ]}
        sessions={[1, 2]}
        myParticipantId="p-rukia"
      />,
    )
    expect(screen.getByText('You')).toBeTruthy()
    expect(screen.getByText('Amani Wekesa')).toBeTruthy()
    expect(screen.queryByText('Rukia Otieno')).toBeNull()
  })
})

/**
 * DECISION 77: SOMEBODY NOT LET IN YET IS NOT "HAS NOT STARTED SESSION 1".
 *
 * Read live on the sales board: "Faraji Odhiambo has not started session 1, and was not part of
 * session 2." about somebody held at the organisation's door - he cannot have started a session
 * nobody let him into. `notLetInYet` on his row now reads the one true fact instead, and drops
 * the per-session list below it (every session would read the same way, for the same reason).
 */
describe('a row not let in yet reads that, not the usual attendance sentence', () => {
  it('reads "Faraji Odhiambo is waiting to be let in." instead of the usual sentence', () => {
    render(
      <NineColumnsIsNotAPhoneScreen
        rows={[{ participantId: 'p-faraji', name: 'Faraji Odhiambo', cells: { '1': 'not-started' }, notLetInYet: true }]}
        sessions={[1, 2]}
      />,
    )
    expect(screen.getByText('Faraji Odhiambo is waiting to be let in.')).toBeTruthy()
    expect(screen.queryByText(/has not started/)).toBeNull()
    expect(screen.queryByText('Check-in 2')).toBeNull()
  })

  it('leaves everybody else\'s row drawn the usual way', () => {
    render(
      <NineColumnsIsNotAPhoneScreen
        rows={[
          { participantId: 'p-faraji', name: 'Faraji Odhiambo', cells: { '1': 'not-started' }, notLetInYet: true },
          { participantId: 'p-amani', name: 'Amani Wekesa', cells: { '1': 'done', '2': 'done' } },
        ]}
        sessions={[1, 2]}
      />,
    )
    expect(screen.getByText('Faraji Odhiambo is waiting to be let in.')).toBeTruthy()
    expect(screen.getByText('Amani Wekesa has checked in for 2 of 2 check-ins so far.')).toBeTruthy()
  })
})
