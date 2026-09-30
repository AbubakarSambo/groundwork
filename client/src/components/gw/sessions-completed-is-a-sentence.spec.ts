import { describe, it, expect } from 'vitest'
import { sessionsCompletedSentence } from './MyParticipation'

/**
 * "SESSIONS COMPLETED" ON THE SETUP TAB WAS A LABEL AND A BARE NUMBER ("1 of 12"), NOT A SENTENCE
 * (U.4 people-group review, item 3) - the wording rule this page keeps everywhere else. Sitting next
 * to the header's "This is your session 2 of 12" it also read as though the two disagreed, when
 * they are two different, both-true counts: how many sessions are finished, and which one is open
 * now.
 */
describe('sessionsCompletedSentence', () => {
  it('says how many are done, out of the total', () => {
    expect(sessionsCompletedSentence(1, 12)).toBe('You have completed 1 session, out of 12.')
    expect(sessionsCompletedSentence(3, 12)).toBe('You have completed 3 sessions, out of 12.')
  })

  it('says nothing about a total nobody knows', () => {
    expect(sessionsCompletedSentence(2, null)).toBe('You have completed 2 sessions.')
    expect(sessionsCompletedSentence(0, null)).toBe('You have completed 0 sessions.')
  })
})
